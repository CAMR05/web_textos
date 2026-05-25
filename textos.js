import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- 1. ESCENA ---
const escena = new THREE.Scene();
// Un fondo oscuro ayuda a que resalte la iluminación de tu lámpara
escena.background = new THREE.Color('#1a1a1a'); 

// --- 2. CÁMARA ---
const canvas = document.querySelector('#lienzo3d');
// PerspectiveCamera(FOV, AspectRatio, Near, Far)
const camara = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

// Posicionamos la cámara como si estuvieras sentado frente al escritorio
camara.position.set(0, 4, 5); 
camara.lookAt(0, 0, 0); // Mirando hacia el centro del escritorio

// --- 3. RENDERIZADOR ---
const renderizador = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderizador.setSize(window.innerWidth, window.innerHeight);
// Limitamos el Pixel Ratio para que no consuma demasiados recursos en pantallas de alta resolución
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 

// ¡Importante para el escritorio! Activamos las sombras
renderizador.shadowMap.enabled = true;
renderizador.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras con bordes suaves

// --- 4. ILUMINACIÓN ---
// Luz ambiental (muy tenue, solo para que no haya oscuridad total en las zonas de sombra)
const luzAmbiental = new THREE.AmbientLight(0xffffff, 0.2);
escena.add(luzAmbiental);

// Luz de la lámpara (SpotLight) - Posicionada provisionalmente
const luzLampara = new THREE.SpotLight(0xffeeba, 10); // Tono cálido, como un foco de escritorio
luzLampara.position.set(-2, 4, -2); // La ajustaremos luego para que coincida con tu modelo de lámpara
luzLampara.castShadow = true;
luzLampara.angle = Math.PI / 6; // Ángulo del cono de luz
luzLampara.penumbra = 0.5; // Difuminado del borde de la luz
escena.add(luzLampara);

// --- 5. BUCLE DE ANIMACIÓN ---
function animar() {
    requestAnimationFrame(animar);
    
    // El renderizador dibuja la escena en cada frame
    renderizador.render(escena, camara);
}
animar();

// --- 6. RESPONSIVO ---
// Esto asegura que si el usuario cambia el tamaño de la ventana, la escena se adapte
window.addEventListener('resize', () => {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderizador.setSize(window.innerWidth, window.innerHeight);
});