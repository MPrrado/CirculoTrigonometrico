/**
 * =====================================================================
 * CONFIGURACIÓN INICIAL DEL ENTORNO
 * =====================================================================
 */
const canvas = document.getElementById('trigCanvas');
const ctx = canvas.getContext('2d');
const infoPanel = document.getElementById('infoPanel');
const mathInput = document.getElementById('mathInput');
const latexPreview = document.getElementById('latexPreview');

const cx = canvas.width / 2;
const cy = canvas.height / 2;
const R = 150; 

let currentCalcExpr = "pi/4"; 
let currentAngleRaw = Math.PI / 4;
let currentAngleReduced = Math.PI / 4;
let currentDenominator = 4;

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.math-tex').forEach(el => {
        katex.render(el.innerText, el, { throwOnError: false });
    });
    
    // Escuchar el input nativo (cuando escribes con el teclado del PC/Móvil)
    mathInput.addEventListener('input', updatePreview);
    
    updatePreview();
    draw();
    updateInfoPanel();
});


/**
 * =====================================================================
 * SCROLL AUTOMÁTICO PARA MÓVILES
 * =====================================================================
 * Lleva la vista hacia el canvas de forma fluida si el ancho es menor a 992px
 */
function scrollToVisualizer() {
    if (window.innerWidth < 992) {
        document.getElementById('visualizer-container').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' // Alinea el tope del canvas con el tope de la pantalla
        });
    }
}


/**
 * =====================================================================
 * LÓGICA DEL TECLADO DE LA CALCULADORA Y CURSOR
 * =====================================================================
 */

/**
 * Inserta un valor exactamente donde está posicionado el cursor de texto.
 */
function insertAtCursor(val) {
    const start = mathInput.selectionStart;
    const end = mathInput.selectionEnd;
    const text = mathInput.value;
    
    // Inyecta el valor y actualiza el campo
    mathInput.value = text.substring(0, start) + val + text.substring(end);
    
    // Mueve el cursor justo después de lo que insertamos
    mathInput.selectionStart = mathInput.selectionEnd = start + val.length;
    mathInput.focus();
    updatePreview();
}

/**
 * Borra el caracter inmediatamente a la izquierda del cursor (como Backspace)
 */
function deleteChar() {
    const start = mathInput.selectionStart;
    if (start === 0) return; // Nada que borrar
    const text = mathInput.value;
    
    // Detectar si estamos borrando la palabra "pi" de golpe
    if (start >= 2 && text.substring(start - 2, start).toLowerCase() === 'pi') {
        mathInput.value = text.substring(0, start - 2) + text.substring(start);
        mathInput.selectionStart = mathInput.selectionEnd = start - 2;
    } else {
        mathInput.value = text.substring(0, start - 1) + text.substring(start);
        mathInput.selectionStart = mathInput.selectionEnd = start - 1;
    }
    mathInput.focus();
    updatePreview();
}

/**
 * Borra absolutamente toda la expresión de la calculadora
 */
function clearAll() {
    mathInput.value = "";
    mathInput.focus();
    updatePreview();
}

/**
 * Función MEJORADA para parsear fracciones matemáticamente correctas.
 * Resuelve el problema: 5pi/6 - 3 ya no pone el "- 3" en el denominador.
 */
function toLaTeX(str) {
    if (!str) return "";
    let tex = str.replace(/\*/g, '\\cdot ');
    tex = tex.replace(/pi/gi, '\\pi');

    // REGEX INTELIGENTE PARA FRACCIONES:
    // Captura lo que está justo antes del '/' y justo después del '/', ignorando signos + o -
    // $1 = Numerador (ej: 5\pi, o contenido entre paréntesis)
    // $2 = Denominador (ej: 6)
    // Usamos un bucle por si hay más de una fracción en la expresión (ej: pi/2 + pi/3)
    let fractionRegex = /([a-zA-Z0-9_.\\]+|\([^)]+\))\s*\/\s*([a-zA-Z0-9_.\\]+|\([^)]+\))/g;
    let previous;
    do {
        previous = tex;
        tex = tex.replace(fractionRegex, '\\frac{$1}{$2}');
    } while (tex !== previous);

    return tex;
}

function updatePreview() {
    const val = mathInput.value.trim();
    if (val === "") {
        latexPreview.innerHTML = '';
    } else {
        katex.render(toLaTeX(val), latexPreview, { throwOnError: false });
    }
}


/**
 * =====================================================================
 * MOTOR DE EVALUACIÓN Y EVENTOS
 * =====================================================================
 */

function setAngleFromButton(rad, expr, denominator) {
    mathInput.value = expr;
    currentCalcExpr = expr;
    currentAngleRaw = rad;
    currentDenominator = denominator;
    currentAngleReduced = reduceToFirstQuadrant(rad);
    
    updatePreview();
    draw();
    updateInfoPanel();
    
    // Al apretar "Ver" en la tabla, escrollea al gráfico automáticamente
    scrollToVisualizer();
}

function applyCalc() {
    let rawExpr = mathInput.value.trim();
    if (rawExpr === "") return;
    
    // Quitar espacios
    let cleanVal = rawExpr.replace(/\s+/g, ''); 
    
    // Multiplicaciones implícitas y soporte de paréntesis
    cleanVal = cleanVal.replace(/(\d)pi/gi, '$1*pi'); // 5pi -> 5*pi
    cleanVal = cleanVal.replace(/pi(\d)/gi, 'pi*$1'); // pi5 -> pi*5
    cleanVal = cleanVal.replace(/(\d)\(/g, '$1*(');   // 5(2) -> 5*(2)
    cleanVal = cleanVal.replace(/\)(\d)/g, ')*$1');   // (2)5 -> (2)*5
    cleanVal = cleanVal.replace(/\)\(/g, ')*(');      // (2)(3) -> (2)*(3)
    
    let evalVal = cleanVal.replace(/pi/gi, 'Math.PI');
    
    // Intentar extraer el denominador de la primera fracción que aparezca
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
            
            // Al apretar Graficar, escrollea al gráfico automáticamente
            scrollToVisualizer();
        } else {
            alert("Error: Expresión matemática incompleta.");
        }
    } catch (e) {
        alert("Sintaxis inválida. Ejemplos correctos: 5pi/6 - 3, 2*(pi/4)");
    }
}

// Reducción al primer cuadrante
function reduceToFirstQuadrant(rad) {
    let normalized = rad % (2 * Math.PI);
    if (normalized < 0) normalized += 2 * Math.PI;

    if (normalized >= 0 && normalized <= Math.PI / 2) return normalized; // I
    if (normalized > Math.PI / 2 && normalized <= Math.PI) return Math.PI - normalized; // II
    if (normalized > Math.PI && normalized <= 1.5 * Math.PI) return normalized - Math.PI; // III
    return 2 * Math.PI - normalized; // IV
}


/**
 * =====================================================================
 * VALORES MATEMÁTICOS EXACTOS (Fracciones en lugar de decimales)
 * =====================================================================
 */
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


/**
 * =====================================================================
 * MOTOR GRÁFICO DEL CANVAS
 * =====================================================================
 */
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


/**
 * =====================================================================
 * ACTUALIZACIÓN DEL PANEL DE RESULTADOS
 * =====================================================================
 */
function updateInfoPanel() {
    let senValRaw = Math.sin(currentAngleRaw);
    let cosValRaw = Math.cos(currentAngleRaw);
    let senValRed = Math.sin(currentAngleReduced);
    let cosValRed = Math.cos(currentAngleReduced);
    
    let exactSenRaw = getExactValueLatex(senValRaw);
    let exactCosRaw = getExactValueLatex(cosValRaw);
    let exactSenRed = getExactValueLatex(senValRed);
    let exactCosRed = getExactValueLatex(cosValRed);
    
    // Obtenemos la versión renderizada de la entrada actual
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
    
    // Inyección matemática con colores
    katex.render(`\\color{#198754}{\\text{sen}}\\left(${texExpr}\\right) = ${exactSenRaw}`, document.getElementById('infoSenRaw'));
    katex.render(`\\color{#dc3545}{\\text{cos}}\\left(${texExpr}\\right) = ${exactCosRaw}`, document.getElementById('infoCosRaw'));
    
    katex.render(`\\color{#198754}{\\text{sen}}(\\alpha_{ref}) = ${exactSenRed}`, document.getElementById('infoSenRed'));
    katex.render(`\\color{#dc3545}{\\text{cos}}(\\alpha_{ref}) = ${exactCosRed}`, document.getElementById('infoCosRed'));
}