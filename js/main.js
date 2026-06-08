import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ==========================================
// --- 1. CONFIGURACIÓN DE DATOS (CARTAS) ---
// ==========================================
const infoCartas = {
    "carta-0": {
        titulo: "TWIN TAPE BRYAN ADAMS",
        texto: "Este reloj dejó de marcar las horas el día que partió...",
        imagen: "assets/img/reloj.jpg"
    },
    "carta-1": {
        titulo: "Taza de Alcatraz",
        texto: "Enviada desde un lugar que ya no existe en los mapas.",
        imagen: "assets/img/postal.jpg"
    },
    "carta-2": {
        titulo: "Moño Azul",
        texto: "El verano de aquel año donde todo parecía eterno.",
        imagen: "assets/img/foto.jpg"
    },
    "carta-3": {
        titulo: "Colección de anillos",
        texto: "Abre un candado cuyo baúl se perdió hace mucho tiempo.",
        imagen: "assets/img/llave.jpg"
    }
};

// ==========================================
// --- 2. CONFIGURACIÓN BÁSICA DE THREE.JS ---
// ==========================================
const escena = new THREE.Scene();
escena.background = new THREE.Color('#1a1a1a'); 

const canvas = document.querySelector('#lienzo3d');
const camara = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

// PUNTOS DE CÁMARA (Inicial: Frente al escritorio / Final: Detrás de la silla)
const posCamaraInicial = { x: 0, y: 3, z: -6 };
const posCamaraFinal = { x: 0, y: 4, z: 5 };

// Inicializamos la cámara en la posición opuesta para la pantalla de inicio
camara.position.set(posCamaraInicial.x, posCamaraInicial.y, posCamaraInicial.z); 
camara.lookAt(0, 0, 0);

const renderizador = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderizador.setSize(window.innerWidth, window.innerHeight);
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 

renderizador.shadowMap.enabled = true;
renderizador.shadowMap.type = THREE.PCFSoftShadowMap; 

// ==========================================
// --- 3. ILUMINACIÓN ---
// ==========================================
const luzAmbiental = new THREE.AmbientLight(0xffffff, 0.2);
escena.add(luzAmbiental);

const luzLampara = new THREE.SpotLight(0xffeeba, 10); 
luzLampara.position.set(-2, 4, -2); 
luzLampara.castShadow = true;
luzLampara.angle = Math.PI / 6; 
luzLampara.penumbra = 0.5; 
escena.add(luzLampara);

// ==========================================
// --- 4. CARGA DE MODELOS ESTÁTICOS ---
// ==========================================
const cargador = new GLTFLoader();
let escritorio;
let caja;
let sobresEnEscena = [];
let cartaEnFoco = null; // Guarda la carta que está volando hacia la cámara

// Cargar Escritorio
cargador.load(
    'modelos/office_desk/scene.gltf', 
    (gltf) => {
        escritorio = gltf.scene;
        escritorio.scale.set(0.05, 0.05, 0.05); 
        escritorio.position.set(0, -1, 0); 
        escritorio.rotation.y = Math.PI; // Rotado 180 grados
        
        escritorio.traverse((nodo) => {
            if (nodo.isMesh) {
                nodo.receiveShadow = true; 
                nodo.castShadow = true;    
            }
        });
        escena.add(escritorio);
        console.log("Escritorio cargado con éxito");
    },
    undefined,
    (error) => console.error("Error al cargar el escritorio:", error)
);

// Cargar Caja
cargador.load(
    'modelos/caja.glb', 
    (gltf) => {
        caja = gltf.scene;
        caja.scale.set(0.4, 0.4, 0.4);
        caja.position.set(1, -1, 0.5);
        caja.rotation.y = -Math.PI / 4; 
        
        caja.traverse((nodo) => {
            if (nodo.isMesh) {
                nodo.receiveShadow = true; 
                nodo.castShadow = true;    
            }
        });
        escena.add(caja);
        console.log("Caja cargada con éxito");
    },
    undefined,
    (error) => console.error("Error al cargar la caja:", error)
);

// ==========================================
// --- 5. LÓGICA DE INTERFAZ DE INICIO ---
// ==========================================

// Efecto de Escritura Manual del Título
const textoTitulo = "Caja de Recuerdos";
const contenedorTitulo = document.getElementById('titulo-escritura');
let i = 0;

function escribirTexto() {
    if (contenedorTitulo && i < textoTitulo.length) {
        contenedorTitulo.innerHTML += textoTitulo.charAt(i);
        i++;
        setTimeout(escribirTexto, 110);
    }
}
escribirTexto();

// Evento click del Botón de Inicio (Transición Cinemática)
document.getElementById('btn-comenzar').addEventListener('click', () => {
    // Desaparecer UI inicial
    gsap.to('#pantalla-inicio', { opacity: 0, duration: 1, onComplete: () => {
        document.getElementById('pantalla-inicio').style.display = 'none';
    }});

    // Viaje de la cámara hacia detrás del escritorio
    gsap.to(camara.position, {
        x: posCamaraFinal.x,
        y: posCamaraFinal.y,
        z: posCamaraFinal.z,
        duration: 3,
        ease: "power2.inOut",
        onUpdate: () => {
            camara.lookAt(0, 0, 0); 
        },
        onComplete: () => {
            desplegarCartas(); // Las cartas salen de la caja al llegar
        }
    });
});

// ==========================================
// --- 6. INTERACTIVIDAD DE LAS CARTAS ---
// ==========================================

// --- CONFIGURACIÓN DE COLORES PARA HOVER ---
const colorEmisivoNormal = new THREE.Color(0x000000);  // Sin brillo
const colorEmisivoDestacado = new THREE.Color(0x444444); // Brillo sutil (puedes subirlo a 0x666666 si quieres más luz)
let objetoHoverActual = null; 

// Función auxiliar para encontrar el nodo raíz del sobre (el que tiene las userData)
function obtenerSobrePadre(objetoIntersectado) {
    let actual = objetoIntersectado;
    while (actual.parent && !actual.userData.id) {
        actual = actual.parent;
    }
    return (actual.userData.id) ? actual : null;
}

function desplegarCartas() {
    console.log("Iniciando secuencia de despliegue de cartas..."); 

    const posicionesFinales = [
        { x: -0.5, y: 0.15, z: -0.2, rot: 0.2 },  // Sobre la mesa, lado izquierdo (lejos de la silla)
        { x: 0.4,  y: 0.15, z: 0.2,  rot: -0.4 }, // Sobre la mesa, lado derecho
        { x: -0.1, y: 0.15, z: 0.1,  rot: 0.1 },  // Sobre la mesa, al centro
        { x: -0.7, y: 0.15, z: 0.3,  rot: 0.6 }   // Sobre la mesa, un poco más al frente
    ];

    cargador.load(
        'modelos/letter-envelope-assets/source/Letter.glb', 
        (gltf) => {
            console.log("¡Modelo del sobre cargado correctamente!"); 

            posicionesFinales.forEach((pos, index) => {
                const sobre = gltf.scene.clone();
                
                // 1. ESCALA AJUSTADA: La subimos a 8 para que tengan una excelente presencia en el escritorio
                sobre.scale.set(8, 8, 8); 
                
                // 2. POSICIÓN INICIAL DESDE LA CAJA: Ahora nacen dentro de ella para que el "salto" sea real
                sobre.position.set(1, -0.5, 0.5);
                
                sobre.userData = { 
                    id: `carta-${index}`, 
                    posicionMesa: pos 
                };

                // 3. CLONACIÓN DE MATERIALES: Vital para que el hover afecte a los sobres uno por uno
                sobre.traverse((nodo) => {
                    if (nodo.isMesh && nodo.material) {
                        nodo.material = nodo.material.clone();
                        nodo.receiveShadow = true;
                        nodo.castShadow = true;
                    }
                });
                
                escena.add(sobre);
                sobresEnEscena.push(sobre);

                // Animación: Salto cinemático de la caja a la mesa
                gsap.to(sobre.position, {
                    x: pos.x,
                    y: pos.y,
                    z: pos.z,
                    duration: 1.5,
                    delay: index * 0.2, 
                    ease: "back.out(1.5)"
                });

                gsap.to(sobre.rotation, {
                    y: pos.rot,
                    duration: 1.5,
                    delay: index * 0.2
                });
            });
        },
        undefined,
        (error) => console.error("❌ ERROR CRÍTICO al cargar Letter.glb:", error)
    );
}

// Configuración del Raycaster y Vector del Ratón
const raycaster = new THREE.Raycaster();
const raton = new THREE.Vector2();

// --- EVENTO DETECCIÓN HOVER (MouseMove) ---
window.addEventListener('mousemove', (evento) => {
    if (cartaEnFoco) return; // Bloquear si hay un documento abierto

    // Actualizar coordenadas del puntero
    raton.x = (evento.clientX / window.innerWidth) * 2 - 1;
    raton.y = -(evento.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(raton, camara);
    const intersecciones = raycaster.intersectObjects(sobresEnEscena, true);

    let sobreDetectado = null;
    if (intersecciones.length > 0) {
        sobreDetectado = obtenerSobrePadre(intersecciones[0].object);
    }

    // Gestionar el cambio de estado del Hover
    if (sobreDetectado) {
        if (sobreDetectado !== objetoHoverActual) {
            // Apagar el sobre anterior si existía
            if (objetoHoverActual) {
                objetoHoverActual.traverse((n) => {
                    if (n.isMesh && n.material) n.material.emissive.copy(colorEmisivoNormal);
                });
            }

            // Encender el nuevo sobre detectado
            objetoHoverActual = sobreDetectado;
            objetoHoverActual.traverse((n) => {
                if (n.isMesh && n.material) n.material.emissive.copy(colorEmisivoDestacado);
            });

            // Cambiar cursor a mano interactiva
            document.body.style.cursor = 'pointer';
        }
    } else {
        // Si salimos de cualquier zona interactiva, restauramos todo
        if (objetoHoverActual) {
            objetoHoverActual.traverse((n) => {
                if (n.isMesh && n.material) n.material.emissive.copy(colorEmisivoNormal);
            });
            objetoHoverActual = null;
            document.body.style.cursor = 'default';
        }
    }
});

// --- EVENTO SELECCIÓN DE CARTA (Click) ---
window.addEventListener('click', () => {
    if (cartaEnFoco) return;

    raycaster.setFromCamera(raton, camara);
    const intersecciones = raycaster.intersectObjects(sobresEnEscena, true);

    if (intersecciones.length > 0) {
        const sobreTocado = obtenerSobrePadre(intersecciones[0].object);

        if (sobreTocado && sobreTocado.userData.id) {
            // Apagar emisión del hover antes de iniciar animación de vuelo
            sobreTocado.traverse((n) => {
                if (n.isMesh && n.material) n.material.emissive.copy(colorEmisivoNormal);
            });
            objetoHoverActual = null;
            document.body.style.cursor = 'default';

            abrirCarta(sobreTocado);
        }
    }
});

function abrirCarta(sobre) {
    cartaEnFoco = sobre;
    const datos = infoCartas[sobre.userData.id];

    // Animación: Vuelo dinámico hacia la pantalla
    gsap.to(sobre.position, {
        x: 0, 
        y: 3.5, 
        z: 3.5, 
        duration: 1.2,
        ease: "power2.out"
    });

    gsap.to(sobre.rotation, {
        x: Math.PI / 2.5, 
        y: 0,
        z: 0,
        duration: 1.2,
        onComplete: () => {
            document.getElementById('titulo-carta').innerText = datos.titulo;
            document.getElementById('texto-carta').innerText = datos.texto;
            document.getElementById('imagen-objeto').src = datos.imagen;
            document.getElementById('modal-lectura').classList.remove('oculto');
        }
    });
}

// Botón HTML para cerrar la carta actual
document.getElementById('btn-cerrar').addEventListener('click', () => {
    if (!cartaEnFoco) return;

    document.getElementById('modal-lectura').classList.add('oculto');
    const posOriginal = cartaEnFoco.userData.posicionMesa;

    // Animación: Regresar a su sitio exacto en la mesa
    gsap.to(cartaEnFoco.position, {
        x: posOriginal.x,
        y: posOriginal.y,
        z: posOriginal.z,
        duration: 1,
        ease: "power2.inOut"
    });

    gsap.to(cartaEnFoco.rotation, {
        x: 0,
        y: posOriginal.rot,
        z: 0,
        duration: 1,
        onComplete: () => {
            cartaEnFoco = null; // Liberar foco
        }
    });
});

// ==========================================
// --- 7. BUCLE DE ANIMACIÓN Y RESPONSIVO ---
// ==========================================
function animar() {
    requestAnimationFrame(animar);
    renderizador.render(escena, camara);
}
animar();

window.addEventListener('resize', () => {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderizador.setSize(window.innerWidth, window.innerHeight);
});