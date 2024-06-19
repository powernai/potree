
import * as THREE from "../../libs/three.js/build/three.module.js";

export class NavigationCube extends THREE.Object3D {

	constructor(viewer){
		super();

		this.viewer = viewer;
		this.domArea = this.viewer.renderArea;
		this.width = 125; // in px
		this.fitToObject = () => {}; // function to compute boundingBox

		let createPlaneMaterial = (img) => {
			let textureLoader = new THREE.TextureLoader();
			let canvas = document.createElement("canvas");
			canvas.width = this.width;
			canvas.height = this.width;
			let ctx = canvas.getContext("2d");
			ctx.font = "64px sans-serif";
			ctx.textBaseline = "middle";
			ctx.textAlign = "center";
			ctx.fillStyle = "#222a32"; // cubeColor from CPMS
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = "white"; // color of the text in cube
			ctx.fillText(img, this.width / 2, this.width / 2);
			let material = new THREE.MeshBasicMaterial( {
				depthTest: true, 
				depthWrite: true,
				side: THREE.DoubleSide,
				map: textureLoader.load(canvas.toDataURL())
			});
			// new TextureLoader().load(
			// 	exports.resourcePath + '/textures/navigation/' + img,
			// 	function (texture) {
			// 		texture.anisotropy = viewer.renderer.capabilities.getMaxAnisotropy();
			// 		material.map = texture;
			// 		material.needsUpdate = true;
			// 	}
			// );
			return material;
		};

		let planeGeometry = new THREE.PlaneGeometry(1, 1);

		this.front = new THREE.Mesh(planeGeometry, createPlaneMaterial('S'));
		this.front.position.y = -0.5;
		this.front.rotation.x = Math.PI / 2.0;
		this.front.updateMatrixWorld();
		this.front.name = "South";
		this.add(this.front);

		this.back = new THREE.Mesh(planeGeometry, createPlaneMaterial('N'));
		this.back.position.y = 0.5;
		this.back.rotation.x = -Math.PI / 2.0;
		this.back.updateMatrixWorld();
		this.back.name = "North";
		this.add(this.back);

		this.left = new THREE.Mesh(planeGeometry, createPlaneMaterial('W'));
		this.left.position.x = -0.5;
		this.left.rotation.y = -Math.PI / 2.0;
		this.left.rotation.z = -Math.PI / 2.0;
		this.left.updateMatrixWorld();
		this.left.name = "West";
		this.add(this.left);

		this.right = new THREE.Mesh(planeGeometry, createPlaneMaterial('E'));
		this.right.position.x = 0.5;
		this.right.rotation.y = 3 * (Math.PI / 2.0);
		this.right.rotation.z = Math.PI / 2.0;
		this.right.updateMatrixWorld();
		this.right.name = "East";
		this.add(this.right);

		this.bottom = new THREE.Mesh(planeGeometry, createPlaneMaterial('D'));
		this.bottom.position.z = -0.5;
		this.bottom.rotation.z = -Math.PI;
		this.bottom.updateMatrixWorld();
		this.bottom.name = "D";
		this.add(this.bottom);

		this.top = new THREE.Mesh(planeGeometry, createPlaneMaterial('U'));
		this.top.position.z = 0.5;
		this.top.updateMatrixWorld();
		this.top.name = "U";
		this.add(this.top);

		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
		this.camera.position.copy(new THREE.Vector3(0, 0, 0));
		this.camera.lookAt(new THREE.Vector3(0, 1, 0));
		this.camera.updateMatrixWorld();
		this.camera.rotation.order = "ZXY";

		let onMouseDown = (event) => {
			if (!this.visible) {
				return;
			}
			
			this.pickedFace = null;
			let mouse = new THREE.Vector2();
			const boundingBox = this.domArea.getBoundingClientRect();
			mouse.x = event.clientX - (window.innerWidth - this.width);
			mouse.y = this.width - (boundingBox.bottom - 75 - event.clientY); // 75 is distance in px from bottom of canvas where cube is
			// To change the distance, also make the same change in PotreeRenderer class in setViewport()

			if(mouse.x < 0 || mouse.y > this.width) return;

			mouse.x = (mouse.x / this.width) * 2 - 1;
			mouse.y = -(mouse.y / this.width) * 2 + 1;

			console.log("Added to build file successfully")
			let raycaster = new THREE.Raycaster();
			raycaster.setFromCamera(mouse, this.camera);
			raycaster.ray.origin.sub(this.camera.getWorldDirection(new THREE.Vector3()));

			let intersects = raycaster.intersectObjects(this.children);

			let minDistance = 1000;
			for (let i = 0; i < intersects.length; i++) {
				if(intersects[i].distance < minDistance) {
					this.pickedFace = intersects[i].object.name;
					minDistance = intersects[i].distance;
				}
			}
			
			if(this.pickedFace) {
				let bbox = this.fitToObject();
				this.viewer.setView(this.pickedFace, bbox);
			}
		};

		this.viewer.renderer.domElement.addEventListener('mousedown', onMouseDown, false);
	}

	update(rotation) {
		this.camera.rotation.copy(rotation);
		this.camera.updateMatrixWorld();
	}

}
