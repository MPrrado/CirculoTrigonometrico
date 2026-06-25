const canvas = document.getElementById('trigCanvas');
const ctx = canvas.getContext('2d');
const infoPanel = document.getElementById('infoPanel');
const mathInput = document.getElementById('mathInput');
const latexRenderLayer = document.getElementById('latexRenderLayer');

const cx = canvas.width / 2;
const cy = canvas.height / 2;
const R = 150; 

let currentCalcExpr = "pi/4"; 
let currentAngleRaw = Math.PI / 4;
let currentAngleReduced = Math.PI / 4;
let currentDenominator = 4;

document.addEventListener("DOMContentLoaded", () => {
    // Renderiza la tabla y las instrucciones
    document.querySelectorAll('.math-tex').forEach(el => {
        katex.render(el.innerText, el, { throwOnError: false });
    });
    
    mathInput.addEventListener('input', updateScreen);
    
    updateScreen();
    draw();
    updateInfoPanel();
});

function scrollToVisualizer() {
    if (window.innerWidth < 992) {
        document.getElementById('visualizer-container').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// INSERCIÓN DE DATOS: Respeta la posición del cursor, incluso si está invisible
function insertAtCursor(val) {
    const start = mathInput.selectionStart;
    const end = mathInput.selectionEnd;
    const text = mathInput.value;
    
    mathInput.value = text.substring(0, start) + val + text.substring(end);
    mathInput.selectionStart = mathInput.selectionEnd = start + val.length;
    mathInput.focus();
    updateScreen();
}

function deleteChar() {
    const start = mathInput.selectionStart;
    if (start === 0) return; 
    const text = mathInput.value;
    
    // Borrado semántico de la palabra 'pi' completa
    if (start >= 2 && text.substring(start - 2, start).toLowerCase() === 'pi') {
        mathInput.value = text.substring(0, start - 2) + text.substring(start);
        mathInput.selectionStart = mathInput.selectionEnd = start - 2;
    } else {
        mathInput.value = text.substring(0, start - 1) + text.substring(start);
        mathInput.selectionStart = mathInput.selectionEnd = start - 1;
    }
    mathInput.focus();
    updateScreen();
}

function clearAll() {
    mathInput.value = "";
    mathInput.focus();
    updateScreen();
}

// Generador LaTeX dinámico para la capa visual
function toLaTeX(str) {
    if (!str) return "";
    let tex = str.replace(/\*/g, '\\cdot ');
    tex = tex.replace(/pi/gi, '\\pi');

    // Construcción inteligente de fracciones (ej: 5\pi/6 queda sobre la línea, restas van por fuera)
    let fractionRegex = /([a-zA-Z0-9_.\\]+|\([^)]+\))\s*\/\s*([a-zA-Z0-9_.\\]+|\([^)]+\))/g;
    let previous;
    do {
        previous = tex;
        tex = tex.replace(fractionRegex, '\\frac{$1}{$2}');
    } while (tex !== previous);

    return tex;
}

function updateScreen() {
    const val = mathInput.value.trim();
    if (val === "") {
        latexRenderLayer.innerHTML = '';
    } else {
        katex.render(toLaTeX(val), latexRenderLayer, { throwOnError: false });
    }
}

function setAngleFromButton(rad, expr, denominator) {
    mathInput.value = expr;
    currentCalcExpr = expr;
    currentAngleRaw = rad;
    currentDenominator = denominator;
    currentAngleReduced = reduceToFirstQuadrant(rad);
    
    updateScreen();
    draw();
    updateInfoPanel();
    scrollToVisualizer();
}

// EVALUACIÓN MATEMÁTICA CON SIMPLIFICACIÓN IMPLÍCITA
function applyCalc() {
    let rawExpr = mathInput.value.trim();
    if (rawExpr === "") return;
    
    let cleanVal = rawExpr.replace(/\s+/g, ''); 
    
    // Multiplicaciones implícitas: "5pi" lo entiende como "5*pi" internamente
    cleanVal = cleanVal.replace(/(\d)pi/gi, '$1*pi'); 
    cleanVal = cleanVal.replace(/pi(\d)/gi, 'pi*$1'); 
    cleanVal = cleanVal.replace(/(\d)\(/g, '$1*(');   
    cleanVal = cleanVal.replace(/\)(\d)/g, ')*$1');   
    cleanVal = cleanVal.replace(/\)\(/g, ')*(');      
    
    let evalVal = cleanVal.replace(/pi/gi, 'Math.PI');
    
    let denominator = 1;
    let match = cleanVal.match(/\/(\d+)/);
    if (match) {
        denominator = parseInt(match[1], 10);
    }

    try {
        let rad = Function('"use strict";return (' + evalVal + ')')();
        
        if (!isNaN(rad)) {
            currentCalcExpr = rawExpr; 
            currentAngleRaw = rad;
            currentDenominator = denominator;
            currentAngleReduced = reduceToFirstQuadrant(rad);
            
            draw();
            updateInfoPanel();
            scrollToVisualizer();
        } else {
            alert("Error: Expresión matemática incompleta.");
        }
    } catch (e) {
        alert("Sintaxis inválida. Ejemplos correctos: 5pi/6 - 3, 2*(pi/4)");
    }
}

function reduceToFirstQuadrant(rad) {
    let normalized = rad % (2 * Math.PI);
    if (normalized < 0) normalized += 2 * Math.PI;

    if (normalized >= 0 && normalized <= Math.PI / 2) return normalized; 
    if (normalized > Math.PI / 2 && normalized <= Math.PI) return Math.PI - normalized; 
    if (normalized > Math.PI && normalized <= 1.5 * Math.PI) return normalized - Math.PI; 
    return 2 * Math.PI - normalized; 
}

function getExactValueLatex(val) {
    const epsilon = 0.0001; 
    
    if (Math.abs(val - 0) < epsilon) return "0";
    if (Math.abs(val - 1) < epsilon) return "1";
    if (Math.abs(val + 1) < epsilon) return "-1";
    
    if (Math.abs(val - 0.5) < epsilon) return "\\frac{1}{2}";
    if (Math.abs(val + 0.5) < epsilon) return "-\\frac{1}{2}";
    
    if (Math.abs(val - Math.sqrt(2)/2) < epsilon) return "\\frac{\\sqrt{2}}{2}";
    if (Math.abs(val + Math.sqrt(2)/2) < epsilon) return "-\\frac{\\sqrt{2}}{2}";
    
    if (Math.abs(val - Math.sqrt(3)/2) < epsilon) return "\\frac{\\sqrt{3}}{2}";
    if (Math.abs(val + Math.sqrt(3)/2) < epsilon) return "-\\frac{\\sqrt{3}}{2}";
    
    return val.toFixed(4);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (currentDenominator > 1 && currentDenominator <= 24) { 
        ctx.beginPath();
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        
        for (let i = 1; i < currentDenominator; i++) {
            let subAngle = (i * Math.PI) / currentDenominator;
            let px1 = cx + R * Math.cos(subAngle);
            let py1 = cy - R * Math.sin(subAngle); 
            let px2 = cx - R * Math.cos(subAngle); 
            let py2 = cy + R * Math.sin(subAngle);
            
            ctx.moveTo(px1, py1);
            ctx.lineTo(px2, py2);
        }
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy); 
    ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height); 
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    ctx.stroke();

    let isDifferent = Math.abs(currentAngleRaw - currentAngleReduced) > 0.001;

    if (isDifferent) {
        let pxO = cx + R * Math.cos(currentAngleRaw);
        let pyO = cy - R * Math.sin(currentAngleRaw);
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(pxO, pyO);
        ctx.strokeStyle = '#6f42c1'; 
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

    let pxR = cx + R * Math.cos(currentAngleReduced);
    let pyR = cy - R * Math.sin(currentAngleReduced);
    
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pxR, pyR);
    ctx.strokeStyle = '#0d6efd'; 
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pxR, cy);
    ctx.strokeStyle = '#dc3545'; 
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pxR, cy);
    ctx.lineTo(pxR, pyR);
    ctx.strokeStyle = '#198754'; 
    ctx.lineWidth = 3.5;
    ctx.stroke();
}

function updateInfoPanel() {
    let senValRaw = Math.sin(currentAngleRaw);
    let cosValRaw = Math.cos(currentAngleRaw);
    let senValRed = Math.sin(currentAngleReduced);
    let cosValRed = Math.cos(currentAngleReduced);
    
    let exactSenRaw = getExactValueLatex(senValRaw);
    let exactCosRaw = getExactValueLatex(cosValRaw);
    let exactSenRed = getExactValueLatex(senValRed);
    let exactCosRed = getExactValueLatex(cosValRed);
    
    let texExpr = toLaTeX(currentCalcExpr);

    let html = `
        <div class="row m-0 text-start w-100">
            <div class="col-sm-6 p-3 border-end">
                <h6 class="mb-3 fw-bold" style="color: #6f42c1;">■ Ángulo Original</h6>
                <div class="mb-2" id="infoSenRaw"></div>
                <div class="" id="infoCosRaw"></div>
            </div>
            <div class="col-sm-6 p-3 bg-light">
                <h6 class="mb-3 fw-bold text-primary">■ Reducido (1er Cuad.)</h6>
                <div class="mb-2" id="infoSenRed"></div>
                <div class="" id="infoCosRed"></div>
            </div>
        </div>
    `;
    
    infoPanel.innerHTML = html;
    
    katex.render(`\\color{#198754}{\\text{sen}}\\left(${texExpr}\\right) = ${exactSenRaw}`, document.getElementById('infoSenRaw'));
    katex.render(`\\color{#dc3545}{\\text{cos}}\\left(${texExpr}\\right) = ${exactCosRaw}`, document.getElementById('infoCosRaw'));
    
    katex.render(`\\color{#198754}{\\text{sen}}(\\alpha_{ref}) = ${exactSenRed}`, document.getElementById('infoSenRed'));
    katex.render(`\\color{#dc3545}{\\text{cos}}(\\alpha_{ref}) = ${exactCosRed}`, document.getElementById('infoCosRed'));
}