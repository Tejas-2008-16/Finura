document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. SELECTORS & DOM ELEMENTS
    // ==========================================
    const amountInput = document.getElementById('loan-amount');
    const amountRange = document.getElementById('loan-amount-range');
    const rateInput = document.getElementById('interest-rate');
    const rateRange = document.getElementById('interest-rate-range');
    const tenureInput = document.getElementById('loan-tenure');
    const tenureRange = document.getElementById('loan-tenure-range');
    
    const tenureTypeYears = document.getElementById('tenure-years');
    const tenureTypeMonths = document.getElementById('tenure-months');
    
    const downPaymentInput = document.getElementById('down-payment');
    const processingFeeInput = document.getElementById('processing-fee');
    
    // Prepayment inputs
    const prepayMonthlyInput = document.getElementById('prepay-monthly');
    const prepayOneTimeInput = document.getElementById('prepay-onetime');
    const prepayMonthInput = document.getElementById('prepay-month');
    
    // Outputs
    const emiOutput = document.getElementById('emi-value');
    const interestOutput = document.getElementById('interest-value');
    const totalAmountOutput = document.getElementById('total-amount-value');
    const principalOutput = document.getElementById('principal-value');
    const savingsRow = document.getElementById('savings-row');
    const savingsOutput = document.getElementById('savings-value');
    
    // Control Buttons
    const btnReset = document.getElementById('btn-reset');
    const btnCopy = document.getElementById('btn-copy');
    const btnShare = document.getElementById('btn-share');
    const btnPrint = document.getElementById('btn-print');
    
    // Schedule & Canvas
    const scheduleBody = document.getElementById('schedule-body');
    const doughnutCanvas = document.getElementById('doughnut-chart');
    const lineCanvas = document.getElementById('line-chart');
    
    // Currency Selector
    const currencySelect = document.getElementById('currency-select');

    let tenureType = 'years'; // 'years' or 'months'
    let currentCurrency = 'USD';
    let currentLocale = 'en-US';
    let currentSymbol = '$';

    // ==========================================
    // 2. FORMATTING UTILITIES & CURRENCY MANAGEMENT
    // ==========================================
    function updateCurrencyUI() {
        if (!currencySelect) return;
        const selectedOption = currencySelect.options[currencySelect.selectedIndex];
        currentSymbol = selectedOption.getAttribute('data-symbol') || '$';
        
        // Update all prefix spans
        document.querySelectorAll('.currency-symbol').forEach(elem => {
            elem.textContent = currentSymbol;
        });
    }

    // Load saved currency
    const savedCurrency = localStorage.getItem('finura_currency');
    if (savedCurrency && currencySelect) {
        currencySelect.value = savedCurrency;
        currentCurrency = savedCurrency;
        currentLocale = currentCurrency === 'INR' ? 'en-IN' : 'en-US';
    }
    updateCurrencyUI();

    const formatCurrency = (val) => {
        return new Intl.NumberFormat(currentLocale, {
            style: 'currency',
            currency: currentCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(val);
    };

    if (currencySelect) {
        currencySelect.addEventListener('change', () => {
            currentCurrency = currencySelect.value;
            currentLocale = currentCurrency === 'INR' ? 'en-IN' : 'en-US';
            localStorage.setItem('finura_currency', currentCurrency);
            updateCurrencyUI();
            calculateEMI();
        });
    }
    
    // ==========================================
    // 3. EVENT BINDINGS: SLIDERS & INPUTS
    // ==========================================
    const syncInputs = (input, range, isFloat = false) => {
        range.addEventListener('input', () => {
            input.value = range.value;
            calculateEMI();
        });
        
        input.addEventListener('change', () => {
            let val = isFloat ? parseFloat(input.value) : parseInt(input.value);
            const min = isFloat ? parseFloat(range.min) : parseInt(range.min);
            const max = isFloat ? parseFloat(range.max) : parseInt(range.max);
            
            if (isNaN(val) || val < min) val = min;
            if (val > max) val = max;
            
            input.value = val;
            range.value = val;
            calculateEMI();
        });
    };

    syncInputs(amountInput, amountRange);
    syncInputs(rateInput, rateRange, true);
    syncInputs(tenureInput, tenureRange);

    // Tenure Type Toggle (Years vs Months)
    if (tenureTypeYears && tenureTypeMonths) {
        tenureTypeYears.addEventListener('click', () => {
            if (tenureType === 'years') return;
            tenureType = 'years';
            tenureTypeYears.classList.add('active');
            tenureTypeMonths.classList.remove('active');
            
            // Adjust slider range and value for Years (1 to 30)
            const currentVal = parseInt(tenureInput.value);
            const newVal = Math.max(1, Math.min(30, Math.round(currentVal / 12)));
            
            tenureRange.min = 1;
            tenureRange.max = 30;
            tenureInput.value = newVal;
            tenureRange.value = newVal;
            
            calculateEMI();
        });

        tenureTypeMonths.addEventListener('click', () => {
            if (tenureType === 'months') return;
            tenureType = 'months';
            tenureTypeMonths.classList.add('active');
            tenureTypeYears.classList.remove('active');
            
            // Adjust slider range and value for Months (12 to 360)
            const currentVal = parseInt(tenureInput.value);
            const newVal = Math.max(12, Math.min(360, currentVal * 12));
            
            tenureRange.min = 12;
            tenureRange.max = 360;
            tenureInput.value = newVal;
            tenureRange.value = newVal;
            
            calculateEMI();
        });
    }

    // Optional Fields triggers
    [downPaymentInput, processingFeeInput, prepayMonthlyInput, prepayOneTimeInput, prepayMonthInput].forEach(elem => {
        if (elem) {
            elem.addEventListener('change', () => {
                // Keep values positive or zero
                if (parseFloat(elem.value) < 0 || isNaN(parseFloat(elem.value))) {
                    elem.value = 0;
                }
                calculateEMI();
            });
        }
    });

    // ==========================================
    // 4. CORE CALCULATION ENGINE
    // ==========================================
    function calculateEMI() {
        const amount = parseFloat(amountInput.value) || 0;
        const rate = parseFloat(rateInput.value) || 0;
        const tenureVal = parseInt(tenureInput.value) || 0;
        const downPayment = parseFloat(downPaymentInput.value) || 0;
        const processingFee = parseFloat(processingFeeInput.value) || 0;
        
        // Prepayments
        const prepayMonthly = parseFloat(prepayMonthlyInput.value) || 0;
        const prepayOneTime = parseFloat(prepayOneTimeInput.value) || 0;
        const prepayOneTimeMonth = parseInt(prepayMonthInput.value) || 0;

        // Principal calculation
        const principal = Math.max(0, amount - downPayment);
        const totalTenureMonths = tenureType === 'years' ? tenureVal * 12 : tenureVal;

        if (principal <= 0 || totalTenureMonths <= 0) {
            emiOutput.textContent = formatCurrency(0);
            interestOutput.textContent = formatCurrency(0);
            totalAmountOutput.textContent = formatCurrency(0);
            principalOutput.textContent = formatCurrency(0);
            if (savingsRow) savingsRow.style.display = 'none';
            clearCharts();
            if (scheduleBody) scheduleBody.innerHTML = '';
            return;
        }

        const monthlyRate = rate / (12 * 100);

        // Standard EMI calculation
        let standardEMI = 0;
        if (monthlyRate === 0) {
            standardEMI = principal / totalTenureMonths;
        } else {
            standardEMI = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalTenureMonths)) / 
                          (Math.pow(1 + monthlyRate, totalTenureMonths) - 1);
        }

        // Generate Amortization Schedule and compute true metrics
        const schedule = [];
        let balance = principal;
        let totalInterestPaid = 0;
        let actualMonths = 0;
        let standardInterestPaid = 0;
        
        // Calculate standard interest without prepayments for comparison
        let tempBal = principal;
        for (let m = 1; m <= totalTenureMonths; m++) {
            const interestPortion = tempBal * monthlyRate;
            const principalPortion = Math.min(tempBal, standardEMI - interestPortion);
            standardInterestPaid += interestPortion;
            tempBal -= principalPortion;
        }

        // Loop month-by-month factoring in prepayments
        for (let m = 1; m <= totalTenureMonths; m++) {
            if (balance <= 0) break;
            
            actualMonths++;
            const interestPortion = balance * monthlyRate;
            let principalPortion = Math.min(balance, standardEMI - interestPortion);
            
            // Add prepayments
            let prepaymentApplied = 0;
            if (prepayMonthly > 0) {
                prepaymentApplied += prepayMonthly;
            }
            if (prepayOneTime > 0 && prepayOneTimeMonth === m) {
                prepaymentApplied += prepayOneTime;
            }
            
            // Limit principal plus prepayment to remaining balance
            if (principalPortion + prepaymentApplied > balance) {
                prepaymentApplied = balance - principalPortion;
            }
            
            const totalPrincipalPaid = principalPortion + prepaymentApplied;
            const endingBalance = balance - totalPrincipalPaid;
            
            totalInterestPaid += interestPortion;
            
            schedule.push({
                month: m,
                beginningBalance: balance,
                payment: principalPortion + interestPortion,
                interest: interestPortion,
                principal: principalPortion,
                prepayment: prepaymentApplied,
                endingBalance: Math.max(0, endingBalance)
            });
            
            balance = Math.max(0, endingBalance);
        }

        const totalPayable = principal + totalInterestPaid + processingFee;
        const interestSaved = Math.max(0, standardInterestPaid - totalInterestPaid);
        const monthsSaved = totalTenureMonths - actualMonths;

        // Display results
        emiOutput.textContent = formatCurrency(standardEMI);
        interestOutput.textContent = formatCurrency(totalInterestPaid);
        totalAmountOutput.textContent = formatCurrency(totalPayable);
        principalOutput.textContent = formatCurrency(principal);

        // Prepayment Savings display
        if (savingsRow && savingsOutput) {
            if (interestSaved > 0 || monthsSaved > 0) {
                savingsRow.style.display = 'flex';
                let savingsText = '';
                if (interestSaved > 0) savingsText += `Saved ${formatCurrency(interestSaved)} interest`;
                if (monthsSaved > 0) {
                    savingsText += savingsText ? ` & ` : ``;
                    savingsText += `shortened tenure by ${monthsSaved} month${monthsSaved > 1 ? 's' : ''}`;
                }
                savingsOutput.textContent = savingsText;
            } else {
                savingsRow.style.display = 'none';
            }
        }

        // Draw visual assets
        renderDoughnutChart(principal, totalInterestPaid);
        renderLineChart(schedule, principal);
        renderAmortizationTable(schedule);
    }

    // ==========================================
    // 5. CANVAS VISUAL RENDERERS
    // ==========================================
    function renderDoughnutChart(principal, interest) {
        if (!doughnutCanvas) return;
        const ctx = doughnutCanvas.getContext('2d');
        const ratio = window.devicePixelRatio || 1;
        
        // Fix scaling for retina screens
        doughnutCanvas.width = 240 * ratio;
        doughnutCanvas.height = 240 * ratio;
        ctx.scale(ratio, ratio);

        const cx = 120;
        const cy = 120;
        const radius = 90;
        const thickness = 24;

        const total = principal + interest;
        const principalAngle = (principal / total) * 2 * Math.PI;
        
        ctx.clearRect(0, 0, 240, 240);

        // Principal Arc (Indigo)
        ctx.beginPath();
        ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + principalAngle);
        ctx.lineWidth = thickness;
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary').trim() || '#6366f1';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Interest Arc (Mint)
        ctx.beginPath();
        ctx.arc(cx, cy, radius, -Math.PI / 2 + principalAngle, 1.5 * Math.PI);
        ctx.lineWidth = thickness;
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#10b981';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Central text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
        
        ctx.font = 'bold 12px Inter';
        ctx.fillText('INTEREST RATIO', cx, cy - 10);
        
        ctx.font = 'bold 20px Outfit';
        ctx.fillText(`${Math.round((interest / total) * 100)}%`, cx, cy + 12);
    }

    function renderLineChart(schedule, initialPrincipal) {
        if (!lineCanvas) return;
        const ctx = lineCanvas.getContext('2d');
        const ratio = window.devicePixelRatio || 1;
        
        const width = 450;
        const height = 200;
        lineCanvas.width = width * ratio;
        lineCanvas.height = height * ratio;
        ctx.scale(ratio, ratio);

        ctx.clearRect(0, 0, width, height);

        if (schedule.length === 0) return;

        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        // X and Y scales
        const maxMonths = schedule.length;
        const maxY = initialPrincipal;

        const getX = (m) => padding.left + (m / maxMonths) * graphWidth;
        const getY = (bal) => padding.top + graphHeight - (bal / maxY) * graphHeight;

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (isLight) ctx.strokeStyle = 'rgba(0,0,0,0.05)';

        for (let i = 1; i <= 4; i++) {
            const yVal = (maxY / 4) * i;
            const y = getY(yVal);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            
            // Labels
            ctx.fillStyle = 'var(--text-muted)';
            ctx.font = '10px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(formatShortCurrency(yVal), padding.left - 10, y + 3);
        }

        // Draw Line & Gradient
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(initialPrincipal));
        schedule.forEach(item => {
            ctx.lineTo(getX(item.month), getY(item.endingBalance));
        });
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'var(--accent-secondary)';
        ctx.stroke();

        // Area Gradient
        ctx.lineTo(getX(maxMonths), getY(0));
        ctx.lineTo(getX(0), getY(0));
        const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw axis details
        ctx.strokeStyle = 'var(--border-glass-hover)';
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();

        // X labels
        ctx.fillStyle = 'var(--text-muted)';
        ctx.textAlign = 'center';
        ctx.font = '10px Inter';
        
        const labelSteps = Math.max(1, Math.round(maxMonths / 5));
        for (let m = 0; m <= maxMonths; m += labelSteps) {
            ctx.fillText(`M${m}`, getX(m), height - padding.bottom + 16);
        }
    }

    function formatShortCurrency(val) {
        if (val >= 1e6) return `${currentSymbol}${(val / 1e6).toFixed(1)}M`;
        if (val >= 1e3) return `${currentSymbol}${(val / 1e3).toFixed(0)}K`;
        return `${currentSymbol}${val.toFixed(0)}`;
    }

    function clearCharts() {
        if (doughnutCanvas) {
            const ctx = doughnutCanvas.getContext('2d');
            ctx.clearRect(0, 0, doughnutCanvas.width, doughnutCanvas.height);
        }
        if (lineCanvas) {
            const ctx = lineCanvas.getContext('2d');
            ctx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
        }
    }

    // ==========================================
    // 6. AMORTIZATION TABLE RENDERER
    // ==========================================
    function renderAmortizationTable(schedule) {
        if (!scheduleBody) return;
        scheduleBody.innerHTML = '';

        let yearlyData = {};

        // Aggregate by Year
        schedule.forEach(item => {
            const yearNum = Math.ceil(item.month / 12);
            if (!yearlyData[yearNum]) {
                yearlyData[yearNum] = {
                    year: yearNum,
                    principalPaid: 0,
                    interestPaid: 0,
                    prepayments: 0,
                    endingBalance: 0,
                    months: []
                };
            }
            yearlyData[yearNum].principalPaid += item.principal;
            yearlyData[yearNum].interestPaid += item.interest;
            yearlyData[yearNum].prepayments += item.prepayment;
            yearlyData[yearNum].endingBalance = item.endingBalance; // Balance at year end
            yearlyData[yearNum].months.push(item);
        });

        // Output Yearly Rows
        Object.keys(yearlyData).forEach(y => {
            const yearObj = yearlyData[y];
            const totalPaid = yearObj.principalPaid + yearObj.interestPaid + yearObj.prepayments;

            // Header Year Row
            const trYear = document.createElement('tr');
            trYear.className = 'schedule-row-year';
            trYear.dataset.year = y;
            
            trYear.innerHTML = `
                <td style="font-weight: 700;">
                    <span class="year-toggle-icon">▸</span>Year ${y}
                </td>
                <td>${formatCurrency(totalPaid)}</td>
                <td>${formatCurrency(yearObj.principalPaid)}</td>
                <td>${formatCurrency(yearObj.interestPaid)}</td>
                <td>${formatCurrency(yearObj.prepayments)}</td>
                <td>${formatCurrency(yearObj.endingBalance)}</td>
            `;

            scheduleBody.appendChild(trYear);

            // Month Breakdown Rows
            yearObj.months.forEach(m => {
                const trMonth = document.createElement('tr');
                trMonth.className = `schedule-row-month month-year-${y}`;
                
                trMonth.innerHTML = `
                    <td style="padding-left: 36px; color: var(--text-secondary);">Month ${m.month}</td>
                    <td>${formatCurrency(m.payment + m.prepayment)}</td>
                    <td>${formatCurrency(m.principal)}</td>
                    <td>${formatCurrency(m.interest)}</td>
                    <td>${formatCurrency(m.prepayment)}</td>
                    <td>${formatCurrency(m.endingBalance)}</td>
                `;
                
                scheduleBody.appendChild(trMonth);
            });

            // Expand / Collapse Action
            trYear.addEventListener('click', () => {
                trYear.classList.toggle('expanded');
                const monthRows = document.querySelectorAll(`.month-year-${y}`);
                monthRows.forEach(row => {
                    row.classList.toggle('show');
                });
            });
        });
    }

    // ==========================================
    // 7. SHARE, COPY & PRINT OPERATIONS
    // ==========================================
    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            const summaryText = `
Finura EMI Calculator Report
--------------------------------------
Loan Amount: ${formatCurrency(amountInput.value)}
Down Payment: ${formatCurrency(downPaymentInput.value || 0)}
Annual Interest Rate: ${rateInput.value}%
Tenure: ${tenureInput.value} ${tenureType}
Monthly EMI: ${emiOutput.textContent}
Total Interest Paid: ${interestOutput.textContent}
Total Amount Paid: ${totalAmountOutput.textContent}
--------------------------------------
Calculate your loans at: ${window.location.href.split('?')[0]}
            `.trim();

            navigator.clipboard.writeText(summaryText).then(() => {
                const prevText = btnCopy.innerHTML;
                btnCopy.innerHTML = 'Copied!';
                setTimeout(() => { btnCopy.innerHTML = prevText; }, 2000);
            }).catch(err => {
                alert('Could not copy report text.');
            });
        });
    }

    if (btnShare) {
        btnShare.addEventListener('click', () => {
            const queryParams = new URLSearchParams({
                amount: amountInput.value,
                rate: rateInput.value,
                tenure: tenureInput.value,
                tenureType: tenureType,
                down: downPaymentInput.value || 0,
                fee: processingFeeInput.value || 0,
                prepayM: prepayMonthlyInput.value || 0,
                prepayO: prepayOneTimeInput.value || 0,
                prepayOM: prepayMonthInput.value || 0,
                currency: currentCurrency
            });
            
            const shareUrl = `${window.location.origin}${window.location.pathname}?${queryParams.toString()}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                const prevText = btnShare.innerHTML;
                btnShare.innerHTML = 'Copied Link!';
                setTimeout(() => { btnShare.innerHTML = prevText; }, 2000);
            }).catch(err => {
                alert('Could not copy sharing link.');
            });
        });
    }

    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            amountInput.value = amountRange.value = 100000;
            rateInput.value = rateRange.value = 8.5;
            tenureInput.value = tenureRange.value = 15;
            if (tenureType === 'months') {
                tenureTypeYears.click();
            }
            downPaymentInput.value = 0;
            processingFeeInput.value = 0;
            prepayMonthlyInput.value = 0;
            prepayOneTimeInput.value = 0;
            prepayMonthInput.value = 0;
            calculateEMI();
        });
    }

    // ==========================================
    // 8. PARSE URL PARAMETERS ON INITIAL LOAD
    // ==========================================
    function loadUrlParams() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.has('currency') && currencySelect) {
            const currencyVal = params.get('currency').toUpperCase();
            const optionExists = Array.from(currencySelect.options).some(opt => opt.value === currencyVal);
            if (optionExists) {
                currencySelect.value = currencyVal;
                currentCurrency = currencyVal;
                currentLocale = currentCurrency === 'INR' ? 'en-IN' : 'en-US';
                updateCurrencyUI();
            }
        }
        
        if (params.has('amount')) amountInput.value = amountRange.value = params.get('amount');
        if (params.has('rate')) rateInput.value = rateRange.value = params.get('rate');
        if (params.has('tenure')) tenureInput.value = tenureRange.value = params.get('tenure');
        
        if (params.has('tenureType')) {
            const type = params.get('tenureType');
            if (type === 'months' && tenureTypeMonths) {
                tenureType = 'months';
                tenureTypeMonths.classList.add('active');
                tenureTypeYears.classList.remove('active');
                tenureRange.min = 12;
                tenureRange.max = 360;
            }
        }
        
        if (params.has('down')) downPaymentInput.value = params.get('down');
        if (params.has('fee')) processingFeeInput.value = params.get('fee');
        if (params.has('prepayM')) prepayMonthlyInput.value = params.get('prepayM');
        if (params.has('prepayO')) prepayOneTimeInput.value = params.get('prepayO');
        if (params.has('prepayOM')) prepayMonthInput.value = params.get('prepayOM');
        
        calculateEMI();
    }

    // Initialize calculations
    loadUrlParams();
    
    // Watch dark/light theme shifts to refresh chart background text elements
    const observer = new MutationObserver(() => {
        calculateEMI();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
});
