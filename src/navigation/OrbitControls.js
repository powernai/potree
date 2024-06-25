/**
 * @author mschuetz / http://mschuetz.at
 *
 * adapted from THREE.OrbitControls by
 *
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 *
 *
 *
 */

import * as THREE from "../../libs/three.js/build/three.module.js";
import {MOUSE} from "../defines.js";
import {Utils} from "../utils.js";
import {EventDispatcher} from "../EventDispatcher.js";

 
export class OrbitControls extends EventDispatcher{
	
	constructor(viewer, scissorZoneIdxs = [0], allowRotation = true, cpmsRaycaster = null){
		super();
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.scene = null;
		// OrbitControls listens to all scissorzone idxs in this array.
		// Maybe this could be changed to just listen to zones that have controls == this.
		this.scissorZoneIdxs = scissorZoneIdxs;
		// allowRotation=false means that only horizontal mouse drag rotation is allowed, no vertical/scroll rotation.
		this.allowRotation = allowRotation;
		this.cpmsRaycaster = cpmsRaycaster;
		this.sceneControls = new THREE.Scene();

		this.rotationSpeed = 5;

		this.fadeFactor = 20;
		this.yawDelta = 0;
		this.pitchDelta = 0;
		// Added third rotation delta.
		this.rollDelta = 0;
		// Merged radiusDelta with panDelta to make translationDelta.
		// Previously, radiusDelta was different from panDeltas
		// because radiusDelta described camera offset with respect to pivot+objects,
		// while panDelta described camera+pivot offset with respect to objects.
		// But now they are the same because they all describe camera offset with respect to pivot+objects,
		// so it makes more sense to handle them together.
		this.translationDelta = new THREE.Vector3(0, 0, 0);

		this.doubleClockZoomEnabled = true;

		this.tweens = [];

		let drag = (e) => {
			if (e.drag.object !== null || !this.scissorZoneIdxs.includes(e.drag.scissorZoneIdx)) {
				return;
			}

			if (e.drag.startHandled === undefined) {
				e.drag.startHandled = true;

				this.dispatchEvent({type: 'start'});
			}

			let ndrag = {
				x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
				y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
			};

			if (e.drag.mouse === MOUSE.LEFT) {
				this.yawDelta += ndrag.x * this.rotationSpeed;
				if (this.allowRotation)
					this.pitchDelta += ndrag.y * this.rotationSpeed;

				this.stopTweens();
			} else if (e.drag.mouse === MOUSE.RIGHT) {
				this.translationDelta.x += ndrag.x;
				this.translationDelta.z += ndrag.y;

				this.stopTweens();
			}
		};

		let drop = e => {
			this.dispatchEvent({type: 'end'});
		};

		let scroll = (e) => {
			if (!this.scissorZoneIdxs.includes(e.scissorZoneIdx)) return;
			// Added left click scroll for 3rd rotation axis.
			if (e.buttons === MOUSE.LEFT) {
				if (!this.allowRotation) return;
				// Rotation 3
				this.rollDelta += e.delta * this.rotationSpeed * 0.05;
			}
			// Pan 3
			// No need to use current radius to scale the delta here. That occurs in translation handling later.
			else this.translationDelta.y += e.delta * 0.05;

			this.stopTweens();
			this.dispatchEvent({ type: "end" });
		};

		let dblclick = (e) => {
			if(this.scissorZoneIdxs.includes(e.scissorZoneIdx) && this.doubleClockZoomEnabled){
				// Make sure pointcloud is not behind anything.
				if(cpmsRaycaster) {
					const raycast = cpmsRaycaster.castRay();
					if(!raycast || !raycast.object || !this.scene.pointclouds.includes(raycast.object.parent))
						return;
				}
				this.zoomToLocation(e.mouse);
			}
		};

		let previousTouch = null;
		let touchStart = e => {
			previousTouch = e;
		};

		let touchEnd = e => {
			previousTouch = e;
		};

		let touchMove = e => {
			if (e.touches.length === 2 && previousTouch.touches.length === 2){
				let prev = previousTouch;
				let curr = e;

				let prevDX = prev.touches[0].pageX - prev.touches[1].pageX;
				let prevDY = prev.touches[0].pageY - prev.touches[1].pageY;
				let prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY);

				let currDX = curr.touches[0].pageX - curr.touches[1].pageX;
				let currDY = curr.touches[0].pageY - curr.touches[1].pageY;
				let currDist = Math.sqrt(currDX * currDX + currDY * currDY);

				// Added div by 0 check
				if (prevDist != 0)
					// No need to use current radius to scale the delta here. That occurs in translation handling later.
					this.translationDelta.y -= currDist / prevDist - 1;

				this.stopTweens();
			}else if(e.touches.length === 3 && previousTouch.touches.length === 3){
				let prev = previousTouch;
				let curr = e;

				let prevMeanX = (prev.touches[0].pageX + prev.touches[1].pageX + prev.touches[2].pageX) / 3;
				let prevMeanY = (prev.touches[0].pageY + prev.touches[1].pageY + prev.touches[2].pageY) / 3;

				let currMeanX = (curr.touches[0].pageX + curr.touches[1].pageX + curr.touches[2].pageX) / 3;
				let currMeanY = (curr.touches[0].pageY + curr.touches[1].pageY + curr.touches[2].pageY) / 3;

				let delta = {
					x: (currMeanX - prevMeanX) / this.renderer.domElement.clientWidth,
					y: (currMeanY - prevMeanY) / this.renderer.domElement.clientHeight
				};

				this.translationDelta.x += delta.x;
				this.translationDelta.z += delta.y;

				this.stopTweens();
			}

			previousTouch = e;
		};

		this.addEventListener('touchstart', touchStart);
		this.addEventListener('touchend', touchEnd);
		this.addEventListener('touchmove', touchMove);
		this.addEventListener('drag', drag);
		this.addEventListener('drop', drop);
		this.addEventListener('mousewheel', scroll);
		this.addEventListener('dblclick', dblclick);
	}

	setScene (scene) {
		this.scene = scene;
	}

	stop(){
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.rollDelta = 0;
		this.translationDelta.set(0, 0, 0);
	}
	
	zoomToLocation(mouse){
		let camera;
		
		let I;
		let i;
		for (i = 0; i < this.scissorZoneIdxs.length; i++) {
			if (!this.viewer.scissorZones[this.scissorZoneIdxs[i]].visible)
				continue;
			camera = this.viewer.getCamera(this.scissorZoneIdxs[i]);

			I = Utils.getMousePointCloudIntersection(
				mouse,
				camera,
				this.viewer,
				this.scene.pointclouds,
				{pickClipped: true},
				this.scissorZoneIdxs[i]
			);
			if (I) break;
		}

		if (!I) {
			return;
		}

		let view = this.viewer.getView(this.scissorZoneIdxs[i]);
		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;

			let domElement = this.renderer.domElement;
			let ray = Utils.mouseToRay(
				mouse,
				camera,
				domElement.clientWidth,
				domElement.clientHeight,
				this.viewer.getScissor(this.scissorZoneIdxs[i]),
				this.viewer.getViewport(this.scissorZoneIdxs[i])
			);

			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere(new THREE.Sphere()).radius;
			targetRadius = Math.min(view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}

		let d = view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		// TODO Unused: let controlsTargetPosition = I.location;

		let animationDuration = 600;
		let easing = TWEEN.Easing.Quartic.Out;

		{ // animate
			let value = {x: 0};
			let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
			tween.easing(easing);
			this.tweens.push(tween);

			let startPos = view.position.clone();
			let targetPos = cameraTargetPosition.clone();

			let startSideOffset = view.sideOffset;
			let startRadius = view.radius;
			let startUpOffset = view.upOffset;

			let targetSideOffset = 0;
			let targetRadius = cameraTargetPosition.distanceTo(I.location);
			let targetUpOffset = 0;

			tween.onUpdate(() => {
				let t = value.x;
				view.position.x = (1 - t) * startPos.x + t * targetPos.x;
				view.position.y = (1 - t) * startPos.y + t * targetPos.y;
				view.position.z = (1 - t) * startPos.z + t * targetPos.z;

				view.sideOffset = (1 - t) * startSideOffset + t * targetSideOffset;
				view.radius = (1 - t) * startRadius + t * targetRadius;
				view.upOffset = (1 - t) * startUpOffset + t * targetUpOffset;
				this.viewer.setMoveSpeed(view.radius);
			});

			tween.onComplete(() => {
				this.tweens = this.tweens.filter(e => e !== tween);
				// Move the pivot indicator sphere from the Move Pivot tool.
				const sphere = this.scene.scene.children.find((x) => x.isPivotIndicatorSphere);
				if(sphere)
					sphere.position.copy(this.scene.view.getPivot());
			});

			tween.start();
		}
	}

	stopTweens () {
		this.tweens.forEach(e => e.stop());
		this.tweens = [];
	}

	update (delta) {
		for (let i = 0; i < this.scissorZoneIdxs.length; i++) {
			let view = this.viewer.getView(this.scissorZoneIdxs[i]);

			{ // apply rotation
				let progression = Math.min(1, this.fadeFactor * delta);

				let yaw = view.yaw;
				let pitch = view.pitch;
				let roll = view.roll;
				let pivot = view.getPivot();

				yaw -= progression * this.yawDelta;
				pitch -= progression * this.pitchDelta;
				roll -= progression * this.rollDelta;

				view.yaw = yaw;
				view.pitch = pitch;
				view.roll = roll;

				// 3 dimensions of offset rather than just radius
				let position = pivot
					.add(view.getSide().multiplyScalar(-view.sideOffset))
					.add(view.direction.multiplyScalar(-view.radius))
					.add(view.getUp().multiplyScalar(-view.upOffset));

				view.position.copy(position);
			}

			{ // apply translation
				let progression = Math.min(1, this.fadeFactor * delta);
				let translationDistance = progression * view.radius * 2;

				let tx = -this.translationDelta.x * translationDistance;
				let ty = this.translationDelta.y * translationDistance;
				let tz = this.translationDelta.z * translationDistance;

				view.translate(tx, ty, tz);
			}

			// Removed "apply zoom" because it is merged with apply pan to make apply translation as explained above.
			// { // apply zoom
			// 	let progression = Math.min(1, this.fadeFactor * delta);

			// 	// let radius = view.radius + progression * this.radiusDelta * view.radius * 0.1;
			// 	let radius = view.radius + progression * this.radiusDelta;

			// 	let V = view.direction.multiplyScalar(-radius);
			// 	let position = new THREE.Vector3().addVectors(view.getPivot(), V);
			// 	view.radius = radius;

			// 	view.position.copy(position);
			// }

			{
				let speed = view.radius;
				this.viewer.setMoveSpeed(speed);
			}

			{ // decelerate over time
				let progression = Math.min(1, this.fadeFactor * delta);
				let attenuation = Math.max(0, 1 - this.fadeFactor * delta);

				this.yawDelta *= attenuation;
				this.pitchDelta *= attenuation;
				this.rollDelta *= attenuation;
				this.translationDelta.multiplyScalar(attenuation);
			}
		}
	}
};
