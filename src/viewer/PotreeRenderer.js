
import * as THREE from "../../libs/three.js/build/three.module.js";
import { EffectComposer } from "../../libs/three.js/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "../../libs/three.js/examples/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "../../libs/three.js/examples/jsm/postprocessing/OutlinePass.js";
import { SAOPass } from '../../libs/three.js/examples/jsm/postprocessing/SAOPass.js';
import { ShaderPass } from '../../libs/three.js/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from '../../libs/three.js/examples/jsm/shaders/FXAAShader.js';
import { GammaCorrectionShader } from '../../libs/three.js/examples/jsm/shaders/GammaCorrectionShader.js';
import { OutlineEffect } from '../../libs/three.js/examples/jsm/effects/OutlineEffect.js'

//I dont think this is used ???
export class PotreeRenderer {

	constructor (viewer) {
		this.viewer = viewer;
		this.renderer = viewer.renderer;

		{
			let dummyScene = new THREE.Scene();
			let geometry = new THREE.SphereGeometry(0.001, 2, 2);
			let mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
			mesh.position.set(36453, 35163, 764712);
			dummyScene.add(mesh);

			this.dummyMesh = mesh;
			this.dummyScene = dummyScene;
			this.composer = null;
		}
	}

	clearTargets(){

	}

	clear(){
		let {viewer, renderer} = this;


		// render skybox
		if(viewer.background === "skybox"){
			renderer.setClearColor(0xff0000, 1);
		}else if(viewer.background === "gradient"){
			renderer.setClearColor(0x00ff00, 1);
		}else if(viewer.background === "black"){
			renderer.setClearColor(0x000000, 1);
		}else if(viewer.background === "white"){
			renderer.setClearColor(0xFFFFFF, 1);
		}else{
			renderer.setClearColor(0x000000, 0);
		}

		renderer.clear();
	}
 
	render(params, scissorIdx = 0){
		let {viewer, renderer} = this;

		const camera = params.camera ? params.camera : viewer.getCamera(scissorIdx);

		viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

		const renderAreaSize = renderer.getSize(new THREE.Vector2());
		const width = params.viewport ? params.viewport[2] : renderAreaSize.x;
		const height = params.viewport ? params.viewport[3] : renderAreaSize.y;

		// render skybox
		if(viewer.background === "skybox"){
			const cameraP =
				viewer.scissorZones[scissorIdx].scene.views[
					viewer.scissorZones[scissorIdx].viewIdxInScene
				].cameraP;
			viewer.skybox.camera.rotation.copy(cameraP.rotation);
			viewer.skybox.camera.fov = cameraP.fov;
			viewer.skybox.camera.aspect = cameraP.aspect;
			
			viewer.skybox.parent.rotation.x = 0;
			viewer.skybox.parent.updateMatrixWorld();

			viewer.skybox.camera.updateProjectionMatrix();
			renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			renderer.render(
				viewer.scissorZones[scissorIdx].scene.sceneBG, 
				viewer.scissorZones[scissorIdx].scene.cameraBG
			);
		}
		
		for(let pointcloud of this.viewer.scene.pointclouds){
			const {material} = pointcloud;
			material.useEDL = false;
		}
		
		viewer.pRenderer.render(viewer.scissorZones[scissorIdx].scene.scenePointCloud, camera, null, {
			clipSpheres: viewer.scissorZones[scissorIdx].scene.volumes.filter(v => (v instanceof Potree.SphereVolume)),
		});
		
		// render scene
		if(!this.composer){
			let composer = new EffectComposer(renderer)
			const renderPass = new RenderPass(viewer.scissorZones[scissorIdx].scene.scene, camera)
			
			const outlinePass = new OutlinePass(
				new THREE.Vector2(width, height),
				viewer.scissorZones[scissorIdx].scene.scene, 
				camera
			);
			outlinePass.edgeStrength = 4.0;
			outlinePass.edgeGlow = 0.3;
			outlinePass.edgeThickness = 1.0;
			outlinePass.pulsePeriod = 0;
			outlinePass.usePatternTexture = false;
			outlinePass.visibleEdgeColor.set("#00ffff");
			outlinePass.hiddenEdgeColor.set("#000000");
			outlinePass.overlayMaterial.blending = THREE.NormalBlending;

			let outlineEffect = new OutlineEffect(renderer, {
				edgeStrength: 2.5,
				blur: false
			});
			this.outlineEffect = outlineEffect

			let saoPass = new SAOPass(viewer.scissorZones[scissorIdx].scene.scene, camera, false, true)
			saoPass.params.saoIntensity = 0.02;
			saoPass.params.saoScale = 100;
			saoPass.params.saoBias = 0.5;

			let fxaaPass = new ShaderPass(FXAAShader)
			fxaaPass.material.uniforms['resolution'].value.set(1 / width, 1 / height);

			let gammaPass = new ShaderPass(GammaCorrectionShader);

			composer.addPass(renderPass)
			composer.addPass(outlinePass)
			composer.addPass(saoPass)
			composer.addPass(fxaaPass);
			composer.addPass(gammaPass);

			this.composer = composer;
		}

		this.outlineEffect.render(viewer.scissorZones[scissorIdx].scene.scene, camera);

		viewer.dispatchEvent({type: "render.pass.scene",viewer: viewer});
		
		viewer.clippingTool.update();
		renderer.render(viewer.clippingTool.sceneMarker, viewer.scissorZones[scissorIdx].scene.cameraScreenSpace); //viewer.scene.cameraScreenSpace);
		renderer.render(viewer.clippingTool.sceneVolume, camera);

		renderer.render(viewer.getControls(scissorIdx).sceneControls, camera);
		
		renderer.clearDepth();
		
		viewer.transformationTool.update();
		
		// Only render things like measurement lines on the main canvas.
		if(scissorIdx === 0) {
			viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});
		}

		// renderer.render(viewer.controls.sceneControls, camera);
		// renderer.render(viewer.clippingTool.sceneVolume, camera);
		// renderer.render(viewer.transformationTool.scene, camera);
		
		renderer.setViewport(width - viewer.navigationCube.width, 
									75, //distance from bottom of the canvas to render the cube. To change this here, we should also make change in NavigationCube class in the raycaster params.
									viewer.navigationCube.width, viewer.navigationCube.width);
		renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
		renderer.setViewport(0, 0, width, height);
		
		viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});
	}

}
