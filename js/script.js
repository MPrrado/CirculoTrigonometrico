// Referencias al DOM
const canvas = document.getElementById('trigCanvas');
const ctx = canvas.getContext('2d');
const infoPanel = document.getElementById('infoPanel');
const latexScreen = document.getElementById('latexScreen');

// Dimensiones fijas internas del Canvas
const cx = canvas.width / 2;
const cy = canvas.height / 2;
const R = 200; 

// Estados globales
let calcExpr = "pi/4"; // Expresión actual en la calculadora
let currentCalcExpr = "pi/4"; // Expresión validada que está siendo graficada
let currentAngleRaw = Math.PI / 4;
let currentAngleReduced = Math.PI / 4;
let currentDenominator = 4;

// Inicialización de la aplicación
updateScreen();
draw();
updateInfoPanel();

// --- LÓGICA DE LA CALCULADORA Y RENDERIZADO LATEX --- //

function btnPress(val) {
    if (val === 'C') {
        calcExpr = "";
    } else if (val === 'DEL') {
        // Borrar el último carácter o la palabra "pi" entera
        if (calcExpr.endsWith('pi')) {
            calcExpr = calcExpr.slice(0, -2);
        } else {
            calcExpr = calcExpr.slice(0, -1);
        }
    } else {
        calcExpr += val;
    }
    updateScreen();
}

function toLaTeX(str) {
    if (!str) return "";
    let tex = str.replace(/\*/g, '\\cdot ');
    tex = tex.replace(/pi/g, '\\pi');
    
    // Convertir divisiones simples en fracciones reales \frac{num}{den}
    if (tex.includes('/')) {
        let parts = tex.split('/');
        tex = `\\frac{${parts[0].trim() || '\\text{?}'}}{${parts[1].trim() || '\\text{?}'}}`;
    }
    return tex;
}

function updateScreen() {
    if (calcExpr === "") {
        latexScreen.innerHTML = '<span class="text-muted fs-6">Ingrese un ángulo...</span>';
    } else {
        katex.render(toLaTeX(calcExpr), latexScreen, { throwOnError: false });
    }
}

// --- LÓGICA MATEMÁTICA Y REDUCCIÓN --- //

function setAngleFromButton(rad, expr, denominator) {
    calcExpr = expr;
    currentCalcExpr = expr;
    currentAngleRaw = rad;
    currentDenominator = denominator;
    currentAngleReduced = reduceToFirstQuadrant(rad);
    
    updateScreen();
    draw();
    updateInfoPanel();
}

function applyCalc() {
    if (calcExpr === "") return;
    
    // Limpiamos todos los espacios en blanco para que la regex no falle (ej: 11 * pi / 6)
    let cleanVal = calcExpr.replace(/\s+/g, '');
    let evalVal = cleanVal.replace(/pi/g, 'Math.PI');
    
    // Extraer denominador
    let denominator = 1;
    let match = cleanVal.match(/\/(\d+)/);
    if (match) {
        denominator = parseInt(match[1], 10);
    }

    try {
        let rad = Function('"use strict";return (' + evalVal + ')')();
        if (!isNaN(rad)) {
            currentCalcExpr = calcExpr;
            currentAngleRaw = rad;
            currentDenominator = denominator;
            currentAngleReduced = reduceToFirstQuadrant(rad);
            
            draw();
            updateInfoPanel();
        } else {
            alert("La expresión evaluada no es un número válido.");
        }
    } catch (e) {
        alert("Expresión inválida. Asegúrese de usar un formato matemático correcto.");
    }
}

function reduceToFirstQuadrant(rad) {
    let normalized = rad % (2 * Math.PI);
    if (normalized < 0) normalized += 2 * Math.PI;

    if (normalized >= 0 && normalized <= Math.PI / 2) return normalized; 
    else if (normalized > Math.PI / 2 && normalized <= Math.PI) return Math.PI - normalized; 
    else if (normalized > Math.PI && normalized <= 1.5 * Math.PI) return normalized - Math.PI; 
    else return 2 * Math.PI - normalized; 
}

// --- DIBUJO DEL CANVAS --- //

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Dibujar Círculo Principal
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = '#aaaaaa';
    ctx.stroke();

    // 2. Dibujar Subdivisiones según el denominador
    if (currentDenominator > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        
        // Atraviesa el círculo dividiendo ambas mitades (arriba y abajo) equitativamente
        for (let i = 0; i < currentDenominator; i++) {
            let subAngle = (i * Math.PI) / currentDenominator;
            let px1 = cx + R * Math.cos(subAngle);
            let py1 = cy - R * Math.sin(subAngle);
            let px2 = cx - R * Math.cos(subAngle); // Lado opuesto
            let py2 = cy + R * Math.sin(subAngle);
            
            ctx.moveTo(px1, py1);
            ctx.lineTo(px2, py2);
        }
        ctx.stroke();
    }

    // Dibujar Ejes X e Y por encima de las subdivisiones
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy); 
    ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height); 
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    ctx.stroke();

    let isDifferent = Math.abs(currentAngleRaw - currentAngleReduced) > 0.001;

    // 3. Dibujar Ángulo Original Ingresado - Color Morado
    if (isDifferent) {
        let pxO = cx + R * Math.cos(currentAngleRaw);
        let pyO = cy - R * Math.sin(currentAngleRaw);
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(pxO, pyO);
        ctx.strokeStyle = '#6f42c1'; // Morado Bootstrap
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(pxO, cy); ctx.lineTo(pxO, pyO);
        ctx.moveTo(cx, cy); ctx.lineTo(pxO, cy);
        ctx.strokeStyle = '#6f42c1';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 4. Dibujar Ángulo Reducido (Primer Cuadrante) - Azul
    let pxR = cx + R * Math.cos(currentAngleReduced);
    let pyR = cy - R * Math.sin(currentAngleReduced);
    
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pxR, pyR);
    ctx.strokeStyle = '#0d6efd'; // Azul Primario
    ctx.lineWidth = 2;
    ctx.stroke();

    // 5. Dibujar Catetos Fijos del Ángulo de Referencia
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pxR, cy);
    ctx.strokeStyle = '#dc3545'; // Rojo (Coseno)
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pxR, cy);
    ctx.lineTo(pxR, pyR);
    ctx.strokeStyle = '#198754'; // Verde (Seno)
    ctx.lineWidth = 4;
    ctx.stroke();
}

// --- ACTUALIZACIÓN SEMÁNTICA E INFORMACIÓN KaTeX --- //

function updateInfoPanel() {
    let senValRaw = Math.sin(currentAngleRaw);
    let cosValRaw = Math.cos(currentAngleRaw);
    let senValRed = Math.sin(currentAngleReduced);
    let cosValRed = Math.cos(currentAngleReduced);
    
    let texExpr = toLaTeX(currentCalcExpr);

    let html = `
        <div class="row m-0 text-start w-100">
            <div class="col-sm-6 p-4 border-end">
                <h6 class="mb-4 fw-bold" style="color: #6f42c1;">■ Ángulo Original</h6>
                <div class="mb-3 fs-5" id="infoSenRaw"></div>
                <div class="fs-5" id="infoCosRaw"></div>
            </div>
            <div class="col-sm-6 p-4 bg-light">
                <h6 class="mb-4 fw-bold text-primary">■ Reducido al 1er Cuadrante</h6>
                <div class="mb-3 fs-5" id="infoSenRed"></div>
                <div class="fs-5" id="infoCosRed"></div>
            </div>
        </div>
    `;
    
    infoPanel.innerHTML = html;
    
    // Inyectar el render de KaTeX indicando el color explícitamente
    katex.render(`\\color{#198754}{\\text{sen}}\\left(${texExpr}\\right) = ${senValRaw.toFixed(4)}`, document.getElementById('infoSenRaw'));
    katex.render(`\\color{#dc3545}{\\text{cos}}\\left(${texExpr}\\right) = ${cosValRaw.toFixed(4)}`, document.getElementById('infoCosRaw'));
    
    katex.render(`\\color{#198754}{\\text{sen}}(\\alpha_{ref}) = ${senValRed.toFixed(4)}`, document.getElementById('infoSenRed'));
    katex.render(`\\color{#dc3545}{\\text{cos}}(\\alpha_{ref}) = ${cosValRed.toFixed(4)}`, document.getElementById('infoCosRed'));
}