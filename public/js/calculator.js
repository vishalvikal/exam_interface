// Calculator logic
(function() {
    // Shared state
    let display;
    let currentInput = '0';
    let memory = 0;
    let isDegree = true;
    let expression = '';

    // Helper to evaluate
    function safeEval(expr) {
        try {
            let evalExpr = expr;

            // 1. Handle Constants
            evalExpr = evalExpr.replace(/π/g, 'Math.PI');
            evalExpr = evalExpr.replace(/e/g, 'Math.E');

            // 2. Handle Power Operator (^) -> (**)
            // Replace ^ with ** but be careful about context.
            // TCS calculator usually treats ^ as x^y.
            evalExpr = evalExpr.replace(/\^/g, '**');

            // 3. Define Scope
            const scope = {
                sin: (x) => Math.sin(isDegree ? x * Math.PI / 180 : x),
                cos: (x) => Math.cos(isDegree ? x * Math.PI / 180 : x),
                tan: (x) => Math.tan(isDegree ? x * Math.PI / 180 : x),
                asin: (x) => { let val = Math.asin(x); return isDegree ? val * 180 / Math.PI : val; },
                acos: (x) => { let val = Math.acos(x); return isDegree ? val * 180 / Math.PI : val; },
                atan: (x) => { let val = Math.atan(x); return isDegree ? val * 180 / Math.PI : val; },
                sinh: Math.sinh,
                cosh: Math.cosh,
                tanh: Math.tanh,
                asinh: Math.asinh, // Inverse hyperbolic not on standard buttons but good to have if typed?
                acosh: Math.acosh,
                atanh: Math.atanh,
                log: Math.log10,
                ln: Math.log,
                log2: Math.log2,
                exp: Math.exp,
                sqrt: Math.sqrt,
                cbrt: Math.cbrt,
                abs: Math.abs,
                fact: (n) => {
                    n = Math.round(n); // Factorial for integers
                    if (n < 0) return NaN;
                    if (n === 0 || n === 1) return 1;
                    let r = 1;
                    for (let i = 2; i <= n; i++) r *= i;
                    return r;
                },
                pow: Math.pow
            };

            // 4. Robust Function Replacement
            // We need to replace function names with scope.<name>
            // Issue: 'asin' contains 'sin'.
            // Solution: Sort keys by length descending so we match 'asin' before 'sin'.
            const keys = Object.keys(scope).sort((a, b) => b.length - a.length);

            // We must also ensure we don't double replace.
            // e.g. "sin(x)" -> "scope.sin(x)".
            // If we then search for "sin", we might find it inside "scope.sin".
            // Strategy: Tokenize or use a regex that respects boundaries, or use a unique placeholder approach.

            // Given the input is controlled (user clicks buttons), we likely have "sin(", "asin(", etc.
            // Let's use placeholders.

            let placeholderMap = {};
            let counter = 0;

            for (let key of keys) {
                // Regex to match function name followed by '('.
                // e.g. sin( -> scope.sin(
                // We use a global replace.
                const pattern = new RegExp(key + '\\(', 'g');
                if (pattern.test(evalExpr)) {
                     // Generate unique placeholder
                     const placeholder = `__FUNC_${counter}__`;
                     placeholderMap[placeholder] = `scope.${key}(`;
                     evalExpr = evalExpr.replace(pattern, placeholder);
                     counter++;
                }
            }

            // Now restore placeholders
            for (let ph in placeholderMap) {
                evalExpr = evalExpr.replace(new RegExp(ph, 'g'), placeholderMap[ph]);
            }

            // 5. Handle Factorial ! -> scope.fact(...)
            // Simple approach: look for number followed by !
            // Or expression followed by !.
            // Regex for number! : (\d+(?:\.\d+)?)! -> scope.fact($1)
            // But user might type (5+3)! -> scope.fact(5+3) is harder with regex.
            // Let's stick to simple number! support or basic parens support.
            // The previous regex /(\d+)!/g handles integers. Let's support decimals just in case.
            evalExpr = evalExpr.replace(/(\d+(?:\.\d+)?)!/g, 'scope.fact($1)');

            // What if user does (2+3)! ?
            // Hard to parse without balancing parens. Let's assume user calculates inner first or accepts limitation.
            // Or we can try to catch `)!` -> replace `)` with `))` and find matching `(` to prepend `scope.fact(`.
            // Too complex for simple regex. We'll stick to number! for now.

            const func = new Function('scope', 'return ' + evalExpr);
            return func(scope);
        } catch (e) {
            console.error(e);
            return 'Error';
        }
    }

    // Public Input Function
    window.calcInput = function(val) {
        if (!display) display = document.getElementById('calc-screen');

        if (currentInput === 'Error' || currentInput === 'Infinity' || currentInput === 'NaN') {
            currentInput = '0';
        }

        if (val === 'C') {
            currentInput = '0';
            expression = '';
        } else if (val === 'MC') {
            memory = 0;
        } else if (val === 'MR') {
            currentInput = memory.toString();
        } else if (val === 'MS') {
            memory = parseFloat(safeEval(currentInput)) || 0;
        } else if (val === 'M+') {
            memory += parseFloat(safeEval(currentInput)) || 0;
        } else if (val === 'M-') {
            memory -= parseFloat(safeEval(currentInput)) || 0;
        } else if (val === '=') {
            let result = safeEval(currentInput);
            // Limit decimals to avoid long floating point issues
            if (typeof result === 'number' && !Number.isInteger(result)) {
                result = parseFloat(result.toFixed(10)); // Precision limit
            }
            currentInput = result.toString();
            expression = '';
        } else if (val === 'back') {
            currentInput = currentInput.slice(0, -1) || '0';
        } else {
            // Smart append
            if (currentInput === '0' && !['+', '-', '*', '/', '%', '.', ')', '!', '^'].includes(val)) {
                currentInput = val;
            } else {
                currentInput += val;
            }
        }
        if(display) display.value = currentInput;
    };

    window.toggleAngle = function(mode) {
        isDegree = (mode === 'deg');
    };

    window.initCalculator = function() {
        display = document.getElementById('calc-screen');
        const container = document.getElementById('calc-container');
        const header = document.getElementById('calc-header');

        if (!container || !header) return;

        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener("mousedown", dragStart);
        document.addEventListener("mouseup", dragEnd);
        document.addEventListener("mousemove", drag);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header) {
                isDragging = true;
            }
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, container);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = "translate(" + xPos + "px, " + yPos + "px)";
            // Reset centering logic if any
            el.style.left = '0';
            el.style.top = '0';
        }
    };
})();
