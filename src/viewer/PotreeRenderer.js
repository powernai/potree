
import * as THREE from "../../libs/three.js/build/three.module.js";

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
					scissorZones[scissorIdx].viewIdxInScene
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
		renderer.render(viewer.scissorZones[scissorIdx].scene.scene, camera);

		viewer.dispatchEvent({type: "render.pass.scene",viewer: viewer});
		
		viewer.clippingTool.update();
		renderer.render(viewer.clippingTool.sceneMarker, viewer.scissorZones[scissorIdx].scene.cameraScreenSpace); //viewer.scene.cameraScreenSpace);
		renderer.render(viewer.clippingTool.sceneVolume, camera);

		renderer.render(viewer.getControls(scissorIdx).sceneControls, camera);
		
		renderer.clearDepth();
		
		viewer.transformationTool.update();
		
		viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});

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
