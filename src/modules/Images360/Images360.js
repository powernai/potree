
import * as THREE from "../../../libs/three.js/build/three.module.js";
import { EventDispatcher } from "../../EventDispatcher.js";
import {TextSprite} from "../../TextSprite.js";

let sg = new THREE.SphereGeometry(1, 8, 8);
let sgHigh = new THREE.SphereGeometry(1, 128, 128);

let sm = new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0x98F4A6 });
let smHovered = new THREE.MeshBasicMaterial({side: THREE.BackSide, color: 0xff0000});
let clearMeshMaterial = new THREE.MeshBasicMaterial({side: THREE.BackSide});
clearMeshMaterial.transparent = true;
clearMeshMaterial.opacity = 0.6;

let raycaster = new THREE.Raycaster();

let previousView = {
	controls: null,
	position: null,
	target: null,
};

let visibleImages = [];

class Image360{

	constructor(file, time, longitude, latitude, altitude, course, pitch, roll){
		this.file = file;
		this.time = time;
		this.longitude = longitude;
		this.latitude = latitude;
		this.altitude = altitude;
		this.course = course;
		this.pitch = pitch;
		this.roll = roll;
		this.mesh = null;
	}
};

// This is file is updated by Varun Veginati. 
// "viewer" is updated with "this.viewer" since when used in cpms it can't recognise what is viewer.
// To view the changes check this pull request -> https://github.com/powernai/potree/pull/1/files
export class Images360 extends EventDispatcher{

	constructor(viewer){
		super();

		this.focusAction = (image)=>{};
		this.unfocusAction = (image)=>{};
		this.viewer = viewer;

		this.selectingEnabled = true;

		this.images = [];
		this.node = new THREE.Object3D();

		this.sphere = new THREE.Mesh(sgHigh, sm);
		this.alternateFocus = false;
		this.sphere.visible = false;
		this.sphere.scale.set(1000, 1000, 1000);
		this.node.add(this.sphere);
		this._visible = true;
		// this.node.add(label);

		this.focusedImage = null;
		this.currentlyHovered = null;

		let elUnfocus = document.createElement("input");
		elUnfocus.type = "button";
		elUnfocus.value = "unfocus";
		elUnfocus.style.position = "absolute";
		elUnfocus.style.top = "3rem";
		elUnfocus.style.right = "8px";
		elUnfocus.style.zIndex = "10000";
		elUnfocus.style.fontSize = "2em";
		elUnfocus.addEventListener("click", () => this.unfocus());
		this.elUnfocus = elUnfocus;

		this.domRoot = viewer.renderer.domElement.parentElement;
		this.domRoot.appendChild(elUnfocus);
		this.elUnfocus.style.display = "none";

		viewer.addEventListener("update", () => {
			this.update(viewer);
		});
		viewer.inputHandler.addInputListener(this);

		this.focusFunction = () => {
			if(this.currentlyHovered && this.currentlyHovered.image360) {
				// calling focus from mini scene's 360 images
				if (this.alternateFocus) {
					if (this.companionObject.focusedImage) {
						let objIdx = this.node.children.indexOf(this.currentlyHovered);
						this.companionObject.currentlyHovered = this.companionObject.node.children[objIdx];
						this.companionObject.focus(this.companionObject.currentlyHovered.image360);
					}
				} else {
					// calling focus on clicking from main 4D scene
					if(!this.focusedImage) {
						this.focus(this.currentlyHovered.image360);
					}
				}
			}
		};

		this.addEventListener("mousedown", this.focusFunction);
	}

	addListeners() {
		this.addEventListener("mousedown", this.focusFunction, false);
	}

	releaseListeners() {
		this.removeEventListener("mousedown", this.focusFunction, false);
	}
	
	set visible(visible){
		if(this._visible === visible){
			return;
		}


		for(const image of this.images){
			image.mesh.visible = visible && (this.focusedImage == null);
		}

		this.sphere.visible = visible && (this.focusedImage != null);
		this._visible = visible;
		this.dispatchEvent({
			type: "visibility_changed",
			images: this,
		});
	}

	get visible(){
		return this._visible;
	}

	focus(image360){
		if(this.focusedImage !== null){
			this.unfocus();
		}

		previousView = {
			controls: previousView.controls ?? this.viewer.controls,
			position: previousView.position ?? this.viewer.scene.view.position.clone(),
			target: previousView.target ?? this.viewer.scene.view.getPivot(),
		};

		this.viewer.setControls(this.viewer.orbitControls);
		this.viewer.orbitControls.doubleClockZoomEnabled = false;

		for(let image of this.images){
			image.mesh.visible = false;
		}

		this.selectingEnabled = false;

		this.load(image360).then( () => {
			this.sphere.visible = true;
			this.sphere.material = this.sphere.material.clone();
			this.sphere.material.map = image360.texture;
			this.sphere.material.needsUpdate = true;
			this.elUnfocus.style.display = '';
		});
		if (!this.alternateFocus) {
			this.sphere.material = clearMeshMaterial;
		}

		{ // orientation
			let {course, pitch, roll} = image360;
			//reset orientation everytime
			this.sphere.rotation.set(0, 0, 0, 'ZYX');
			// Apply inverse node rotations in order (-Z, -Y, -X)
			this.sphere.rotateZ(-this.node.rotation.z);
			this.sphere.rotateY(-this.node.rotation.y);
			this.sphere.rotateX(-this.node.rotation.x);
			//Apply course, pitch and roll
			this.sphere.rotateZ(THREE.MathUtils.degToRad(-course + 90));
			this.sphere.rotateY(THREE.MathUtils.degToRad(-pitch));
			this.sphere.rotateX(THREE.MathUtils.degToRad(+roll + 90));
			//to render at last so that its always visible ahead of BIM
			this.sphere.renderOrder = 999;
			//clearDepth removes any depthBuffer the render has so that the next object is always rendered and shown on top
			this.sphere.onBeforeRender = function (renderer) {
				renderer.clearDepth();
			};
		}

		//get world position instead of relative position
		let pos_vec = new THREE.Vector3();
		image360.mesh.getWorldPosition(pos_vec);
		this.sphere.position.set(pos_vec.x, pos_vec.y, pos_vec.z);

		let target = new THREE.Vector3(pos_vec.x, pos_vec.y, pos_vec.z);
		let dir = target.clone().sub(this.viewer.scene.view.position).normalize();
		let move = dir.multiplyScalar(0.000001);
		let newCamPos = target.clone().sub(move);

		this.viewer.scene.view.setView(
			newCamPos, 
			newCamPos, // this change is done to not update the look at vector when switched from old to new image. Updated by Varun Veginati
			500
		);

		this.focusedImage = image360;

		this.viewer.scissorZones[0].scene.images360.forEach((images360) => {
			if (images360.selectingEnabled && images360.visible) {
				visibleImages.push(images360);
				images360.hide();
				images360.releaseListeners();
			}
		});
		
		this.focusAction(image360);
	}

	unfocus(){
		this.selectingEnabled = true;
		visibleImages.forEach((images360) => {
			images360.show();
			images360.addListeners();
		});
		visibleImages = [];
		for(let image of this.images){
			image.mesh.visible = true;
		}

		let image = this.focusedImage;

		if(image === null){
			return;
		}


		this.sphere.material.map = null;
		this.sphere.material.needsUpdate = true;
		this.sphere.visible = false;

		this.sphere.material = clearMeshMaterial;

		let pos = this.viewer.scene.view.position;
		let target = this.viewer.scene.view.getPivot();
		let dir = target.clone().sub(pos).normalize();
		let move = dir.multiplyScalar(10);
		let newCamPos = target.clone().sub(move);

		this.viewer.orbitControls.doubleClockZoomEnabled = true;
		this.viewer.setControls(previousView.controls);

		this.viewer.scene.view.setView(
			previousView.position, 
			previousView.target,
			500
		);

		this.focusedImage = null;

		this.elUnfocus.style.display = "none";

		if(!this.alternateFocus) {
			this.sphere.material = sm;
		}
		
		this.unfocusAction(image);
	}
	
	setFocusAction(action=(image)=>{}) {
		this.focusAction = action;
	}
	
	setUnfocusAction(action=()=>{}) {
		this.unfocusAction = action;
	}

	load(image360){

		return new Promise(resolve => {
			let texture = new THREE.TextureLoader().load(image360.file, resolve);
			texture.wrapS = THREE.RepeatWrapping;
			texture.repeat.x = -1;

			image360.texture = texture;
		});

	}

	handleHovering(viewer){
		let mouse = viewer.inputHandler.mouse;
		let domElement = viewer.renderer.domElement;

		let intersections = [];
		// Backwards loop so the last rendered zone (the one rendered on top) catches the mouse in case of overlapping canvases.
		for (let i = viewer.scissorZones.length - 1; i >= 0; i--) {
			if (
				!viewer.scissorZones[i].visible ||
				!viewer.scissorZones[i].scene.images360.includes(this)
			)
				continue;
			let camera = viewer.getCamera(i);
			let ray = Potree.Utils.mouseToRay(mouse, camera, 
				domElement.clientWidth, domElement.clientHeight,
				viewer.getScissor(i), viewer.getViewport(i)
			);
			if (ray) {
				// let tStart = performance.now();
				raycaster.ray.copy(ray);
				intersections.push(raycaster.intersectObjects(this.node.children));
			}
		}
		intersections = intersections.flat();

		if(intersections.length === 0){
			// label.visible = false;

			return;
		}

		let intersection = intersections[0];
		// Highlight the same sphere on other scene. Don't highlight if zoomed into the 360 view.
		if (!this.focusedImage && intersections.length > 1) {
			this.currentlyHovered = intersection.object;
			this.currentlyHovered.material = smHovered;
		}
		if (this.companionObject && !this.companionObject.focusedImage && this.alternateFocus && intersections.length > 1) {
			let objIdx = this.node.children.indexOf(intersection.object);
			this.companionObject.currentlyHovered = this.companionObject.node.children[objIdx];
			this.companionObject.currentlyHovered.material = smHovered;
		}

		//label.visible = true;
		//label.setText(this.currentlyHovered.image360.file);
		//this.currentlyHovered.getWorldPosition(label.position);
	}

	update(){

		let {viewer} = this;

		if(this.currentlyHovered){
			this.currentlyHovered.material = sm;
			this.currentlyHovered = null;
		}

		if(this.selectingEnabled){
			this.handleHovering(viewer);
		}

	}

};


export class Images360Loader{

	static async load(url, viewer, params = {}){

		if(!params.transform){
			params.transform = {
				forward: a => a,
			};
		}
		
		// updated by Varun Veginati. This update is to use coordinates file in json format instead of txt file.
		let response = await fetch(`${url}/coordinates.json`);
		let data = await response.json();

		let lines = data.coordinates;
		// let coordinateLines = lines.slice(1);

		let images360 = new Images360(viewer);

		for(let line of lines){

			let [filename, time, long, lat, alt, course, pitch, roll] = line;
			time = parseFloat(time);
			long = parseFloat(long);
			lat = parseFloat(lat);
			alt = parseFloat(alt);
			course = parseFloat(course);
			pitch = parseFloat(pitch);
			roll = parseFloat(roll);

			filename = filename.replace(/"/g, "");
			let file = `${url}/${filename}`;

			let image360 = new Image360(file, time, long, lat, alt, course, pitch, roll);

			let xy = params.transform.forward([long, lat]);
			let position = [...xy, alt];
			image360.position = position;

			images360.images.push(image360);
		}

		Images360Loader.createSceneNodes(images360, params.transform);

		return images360;

	}

	static createSceneNodes(images360, transform){

		for(let image360 of images360.images){
			let {longitude, latitude, altitude} = image360;
			let xy = transform.forward([longitude, latitude]);

			let mesh = new THREE.Mesh(sg, sm);
			mesh.position.set(...xy, altitude);
			mesh.scale.set(1, 1, 1);
			mesh.material.transparent = true;
			mesh.material.opacity = 0.6;
			mesh.image360 = image360;

			{ // orientation
				var {course, pitch, roll} = image360;
				mesh.rotation.set(
					THREE.Math.degToRad(+roll + 90),
					THREE.Math.degToRad(-pitch),
					THREE.Math.degToRad(-course + 90),
					"ZYX"
				);
			}

			images360.node.add(mesh);

			image360.mesh = mesh;
		}
	}
}


