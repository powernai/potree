
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

// This file is updated by Jonathan Miner.
// Access to CpmsRaycaster is given to allow all types of objects to block hovering/clicks on the images.
// Access to T60ImageManager is given so that when unfocusing, it will now make other images visible even if they did not exist at the time of focusing.
// Previously, it relied on creating a list of all images at the time of focusing, which it would make visible at the time of unfocusing.
// It also now considers multiple visibility requirements and does not show other files upon unfocusing unless they meet all requirements.
export class Images360 extends EventDispatcher{

	constructor(viewer, cpmsRaycaster, manager){
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
		this.manager = manager;
		// this.node.add(label);

		this.focusedImage = null;
		this.currentlyHovered = null;
		this.cpmsRaycaster = cpmsRaycaster;

		this.onUpdate = () => this.update(viewer);

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
					this.focus(this.currentlyHovered.image360);
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
		if(this.manager.isFocussed()){
			this.manager.unFocus(true);
		}
		else {
			// When moving focus from one image to another, preserve the return position for the camera. Otherwise, set it from the current position.
			previousView = {};
		}
		this.manager.setSelected360(this.parent);

		this.focusedImage = image360;

		previousView = {
			controls: previousView.controls ?? this.viewer.controls,
			position: previousView.position ?? this.viewer.scene.view.position.clone(),
			target: previousView.target ?? this.viewer.scene.view.getPivot(),
		};

		this.viewer.setControls(this.viewer.orbitControls);
		this.viewer.orbitControls.doubleClockZoomEnabled = false;

		// Make focusedImage's object invisible and other objects small.
		this.focusedImage.mesh.visible = false;
		for(let image of this.images){
			const scale = 0.05;
			// This line would give all the objects the same screen-size regardless of distance.
			// But it seems too hard to navigate the images like this, it's hard to get a sense of the 3D shape.
			//const scale = 0.01*image.mesh.position.distanceTo(image360.mesh.position);

			image.mesh.scale.set(scale,scale,scale);
		}

		this.load(image360).then( () => {
			// Moving fast, this sphere isn't focused anymore by the time the texture loads. Dispose the texture.
			// Or, moving fast, this sphere was unfocused and refocused. Dispose the new texture and keep the old one.
			if(image360 !== this.focusedImage || (this.sphere.material !== sm && this.sphere.material !== clearMeshMaterial)) {
				image360.texture.dispose();
				return;
			}
			if(this.visible)
				this.sphere.visible = true;
			this.sphere.material = this.sphere.material.clone();
			this.sphere.material.map = image360.texture;
			this.sphere.material.needsUpdate = true;
		});
		if (!this.alternateFocus) {
			this.sphere.material = clearMeshMaterial;
		}

		{ // orientation
			let {course, pitch, roll} = image360;
			//reset orientation everytime
			this.sphere.rotation.set(0, 0, 0, 'ZYX');

			// Code for old coordinates.json files that use unit vectors. A unit vector has less degrees of freedom so it can be slightly incorrect in some cases.
			/*
			this.sphere.rotateY(MathUtils.degToRad(-90));
			this.sphere.rotateX(MathUtils.degToRad(180));
			const quat = new Quaternion().setFromUnitVectors(new Vector3(1,0,0),new Vector3(course,pitch,roll));
			this.sphere.applyQuaternion(quat);
			*/

			// Code for new coordinates.json files that use euler angles (ZYX, extrinsic, in degrees).
			this.sphere.rotation.set(THREE.MathUtils.degToRad(course), THREE.MathUtils.degToRad(pitch), THREE.MathUtils.degToRad(roll), 'ZYX');
			this.sphere.rotateY(THREE.MathUtils.degToRad(-90));
			this.sphere.rotateX(THREE.MathUtils.degToRad(180));

			//to render at last so that its always visible ahead of BIM
			this.sphere.renderOrder = 999;
			//clearDepth removes any depthBuffer the render has so that the next object is always rendered and shown on top
			this.sphere.onBeforeRender = function (renderer) {
				renderer.clearDepth();
			};
		}

		this.sphere.position.copy(image360.mesh.position);

		//get world position instead of relative position
		let target = new THREE.Vector3();
		image360.mesh.getWorldPosition(target);
		// Keep the same facing direction when entering/switching between images.
		let dir = this.viewer.scene.view.direction.clone().normalize();
		let move = dir.multiplyScalar(0.000001);
		let newCamPos = target.clone().sub(move);

		this.viewer.scene.view.setView(
			newCamPos, 
			target,
			500
		);

		this.focusAction(image360);
	}

	unfocus(immediate = false){
		
		let image = this.focusedImage;

		if(image === null){
			return;
		}

		if(this.sphere.material !== sm && this.sphere.material !== clearMeshMaterial) {
			this.sphere.material.map.dispose();
			this.sphere.material.map = null;
			this.sphere.material.dispose();
			this.sphere.material = null;
		}

		this.sphere.visible = false;

		this.sphere.material = clearMeshMaterial;

		/*
		let pos = this.viewer.scene.view.position;
		let target = this.viewer.scene.view.getPivot();
		let dir = target.clone().sub(pos).normalize();
		let move = dir.multiplyScalar(10);
		let newCamPos = target.clone().sub(move);
		*/

		this.viewer.orbitControls.doubleClockZoomEnabled = true;
		this.viewer.setControls(previousView.controls);

		this.focusedImage.mesh.visible = true;
		this.focusedImage = null;

		if(!this.alternateFocus) {
			this.sphere.material = sm;
		}

		this.viewer.scene.view.setView(
			previousView.position, 
			previousView.target,
			500,
			() => {
				if(!immediate) {
					if(this.focusedImage === null) {
						if(this.visible) {
							for(let image of this.images){
								image.mesh.scale.set(1,1,1);
							}
						}
						this.selectingEnabled = true;
					}
				}
			}
		);
		if(immediate) {
			if(this.focusedImage === null) {
				if(this.visible) {
					for(let image of this.images){
						image.mesh.scale.set(1,1,1);
					}
				}
				this.selectingEnabled = true;
			}
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
			if(i == 0 && this.cpmsRaycaster) {
				// Check if this 360image set is behind anything else.
				const raycast = this.cpmsRaycaster.castRay();
				if(!raycast || raycast.object !== this || viewer.navigationCube.hovered)
					break;
			}
			let camera = viewer.getCamera(i);
			let ray = Potree.Utils.mouseToRay(mouse, camera, 
				domElement.clientWidth, domElement.clientHeight,
				viewer.getScissor(i), viewer.getViewport(i)
			);
			if (ray) {
				// let tStart = performance.now();
				raycaster.ray.copy(ray);
				let spheres = this.node.children;
				if(this.focusedImage) {
					spheres = spheres.filter((sphere) => sphere !== this.focusedImage.mesh);
				}
				intersections.push(raycaster.intersectObjects(spheres));
			}
		}
		intersections = intersections.flat();

		if(intersections.length === 0){
			// label.visible = false;

		return;
		}

			let intersection = intersections[0];
			// Highlight the same sphere on other scene. Don't highlight if zoomed into the 360 view.
			if (intersections.length > 1) {
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

		const newVisible = this.manager.shouldBeVisible(this);
		if(newVisible && !this.visible) {
			this.show();
		}
		else if(!newVisible && this.visible) {
			this.hide();
		}
	}

};


export class Images360Loader{

	static async load(url, viewer, cpmsRaycaster, manager, params = {}){

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

		let images360 = new Images360(viewer, cpmsRaycaster, manager);

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


