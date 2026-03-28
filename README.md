
# Solar System Engine | <a href="https://projectpokemon.org/images/shiny-sprite/solgaleo.gif"><img src="https://projectpokemon.org/images/normal-sprite/solgaleo.gif" alt="Solgaleo" height="60"></a> 

An advanced **WebGL-based** astrophysics and rendering engine built to simulate the **Solar System** with accurate orbital mechanics, dynamic shadow mapping, and interactive 3D UI. 
The project leverages hardware-accelerated 3D graphics to render complex Keplerian ellipses, custom GLSL atmospheric shaders, and massive instanced geometries, ensuring flawless 60fps performance across desktop and mobile devices.

Powered by **Three.js** and optimized for zero-latency DOM updates and fluid cinematic transitions.



https://github.com/user-attachments/assets/510bb3ed-a3e0-4027-ab1f-d61d39e6cb5b


[**Try the Live Demo**](https://vor7rex.github.io/Solar-System/) <a href="https:/pokemondbnet/pokedex/jirachi"><img src="https://img.pokemondb.net/sprites/black-white/anim/normal/jirachi.gif" alt="Jirachi" height="50"><a href="https://pokemondb.net/pokedex/mew"><img src="https://img.pokemondb.net/sprites/black-white/anim/normal/mew.gif" alt="Mew" height="50">
</a>
<br>


## Mathematical Core: Keplerian Dynamics
At the heart of the engine lies a parametric orbital solver that simulates real planetary eccentricity. Unlike standard circular orbits, this engine computes position vectors based on focal offsets, ensuring astronomical accuracy.

<img src="assets/script.svg" width="70%"  alt="Orbit Logic Snippet">

## Core Architecture & Features
- **Keplerian Orbital Mechanics**: Implementation of `THREE.EllipseCurve` and parametric equations to compute real-time elliptical paths, factoring in semi-major axes and eccentricity for realistic planetary movement.
- **Massive Instanced Rendering**: Utilization of `THREE.InstancedMesh` to render an asteroid belt of over 28,000 independent geometries in a single draw call, preventing VRAM leaks and CPU bottlenecks.
- **Dynamic Shadow Mapping**: Configured 4K resolution `PointLight` casting `PCFSoftShadowMap`, calculating real-time eclipses, planetary occlusion, and shadow projection from Saturn's rings onto its atmospheric volume.
- **Custom GLSL Shaders**: Integrated custom Vertex and Fragment shaders to compute atmospheric scattering (`pow(0.55 - dot(vNormal, viewDir), 4.0)`) and additive blending for terrestrial planets and ice giants.
- **Responsive Liquid Glass UI & Optical Kinematics**: A highly optimized CSS `backdrop-filter` interface coupled with dynamic `camera.setViewOffset` frustum calculations to keep the 3D subject perfectly centered across all device viewports (Thumb Zone ergonomics on mobile).

<br>

## Technologies

| **Core Stack** | **Implementation Details** |
| :--- | :--- |
| <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" /> | ES6+ Module pattern (IIFE), RequestAnimationFrame loop, MathUtils linear interpolation (Lerp), DOM Event Delegation |
| <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white" /> | Scene graph management, OrbitControls, TextureLoader, MeshStandardMaterial, EffectComposer (UnrealBloomPass) |
| <img src="https://img.shields.io/badge/GLSL-5586A4?style=for-the-badge&logo=opengl&logoColor=white" /> | Custom Vertex & Fragment shaders for localized atmospheric glow and light intensity calculations |
| <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" /> | Liquid Glassmorphism, Deep Engraved text masking (`background-clip`), fluid `clamp()` typography, Media Queries |
<br>

## Quick Start

1. Clone the repository:

    ```bash
    git clone https://github.com/Vor7reX/Solar-System.git
    ```
2. Navigate to the project directory:

    ```bash
    cd Solar-System
    ```

3. Open the `index.html` file via a local web server *(Note: Running via VS Code 'Live Server' or similar is required to load the textures correctly and bypass browser CORS restrictions).*

---
<div align="left">
<p valign="middle">
Created by <b>Vor7reX</b>
<a href="https://projectpokemon.org/images/shiny-sprite/mawile-mega.gif">
<img src="https://projectpokemon.org/images/shiny-sprite/mawile-mega.gif" width="75" valign="middle" alt="Mega Mawile Shiny">
</a>
</p>
</div>
