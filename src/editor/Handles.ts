const ARROW_RADIUS_INNER = 0.05;
const ARROW_RADIUS_OUTER = 0.15;
const ARROW_LENGTH = 0.35;
const ARROW_TIP = 0.15;

const HANDLE_DISTANCE = 0.5;

const GRAB_RADIUS = 0.1;
const GRAB_START = 0.4;
const GRAB_END = 1.1;

enum Axis {
	None,
	X,
	Y,
	Z
}

class Handles implements Renderer {
	xNegative: MeshRenderer;
	xPositive: MeshRenderer;
	yNegative: MeshRenderer;
	yPositive: MeshRenderer;
	zNegative: MeshRenderer;
	zPositive: MeshRenderer;
	meshRenderers: MeshRenderer[] = [];

	position: Vector3;
	camera: Camera;

	handleAlpha: Vector3 = Vector3.one();

	grabbedAxis: Axis = Axis.None;
	grabbedPosition: number;

	private createRenderer(mesh: Mesh, color: Vector3): MeshRenderer {
		let renderer = new MeshRenderer();
		renderer.setMesh(mesh);
		renderer.color = color;
		this.meshRenderers.push(renderer);
		return renderer;
	}

	constructor(camera: Camera) {
		let mesh = Handles.getArrowMesh(20);

		this.xNegative = this.createRenderer(mesh, new Vector3(1, 0, 0));
		this.xPositive = this.createRenderer(mesh, new Vector3(1, 0, 0));
		this.yNegative = this.createRenderer(mesh, new Vector3(0, 1, 0));
		this.yPositive = this.createRenderer(mesh, new Vector3(0, 1, 0));
		this.zNegative = this.createRenderer(mesh, new Vector3(0, 0, 1));
		this.zPositive = this.createRenderer(mesh, new Vector3(0, 0, 1));

		this.position = Vector3.zero();
		this.updateTransforms();
		this.camera = camera;
	}

	public render(camera: Camera) {
		this.xPositive.alpha = this.handleAlpha.x;
		this.xNegative.alpha = this.handleAlpha.x;
		this.yPositive.alpha = this.handleAlpha.y;
		this.yNegative.alpha = this.handleAlpha.y;
		this.zPositive.alpha = this.handleAlpha.z;
		this.zNegative.alpha = this.handleAlpha.z;

		gl.colorMask(false, false, false, false);
		gl.depthFunc(gl.ALWAYS);
		for (let renderer of this.meshRenderers) {
			renderer.render(camera);
		}
		gl.depthFunc(gl.LEQUAL);
		for (let renderer of this.meshRenderers) {
			renderer.render(camera);
		}
		gl.colorMask(true, true, true, true);
		for (let renderer of this.meshRenderers) {
			renderer.render(camera);
		}
	}

	public updateTransforms() {
		this.xPositive.transform = Quaternion.euler(new Vector3(0, -90, 0)).toMatrix()
			.times(Matrix4.getTranslation(this.position.plus(new Vector3(HANDLE_DISTANCE, 0, 0))));
		this.xNegative.transform = Quaternion.euler(new Vector3(0, 90, 0)).toMatrix()
			.times(Matrix4.getTranslation(this.position.plus(new Vector3(-HANDLE_DISTANCE, 0, 0))));
		this.yPositive.transform = Quaternion.euler(new Vector3(90, 0, 0)).toMatrix()
			.times(Matrix4.getTranslation(this.position.plus(new Vector3(0, HANDLE_DISTANCE, 0))));
		this.yNegative.transform = Quaternion.euler(new Vector3(-90, 0, 0)).toMatrix()
			.times(Matrix4.getTranslation(this.position.plus(new Vector3(0, -HANDLE_DISTANCE, 0))));
		this.zPositive.transform = Matrix4.getTranslation(this.position.plus(new Vector3(0, 0, HANDLE_DISTANCE)));
		this.zNegative.transform = Quaternion.euler(new Vector3(180, 0, 0)).toMatrix()
			.times(Matrix4.getTranslation(this.position.plus(new Vector3(0, 0, -HANDLE_DISTANCE))));		
	}

	private static getVector(angle: number, radius: number, z: number): Vector3 {
		return new Vector3(radius * Math.cos(angle), radius * Math.sin(angle), z);
	}
	
	public static getArrowMesh(subdivisions: number): Mesh {
		let triangles: Triangle[] = [];

		for (let i = 0; i < subdivisions; i++) {
			let angle1 = i / subdivisions * 2 * Math.PI;
			let angle2 = (i + 1) / subdivisions * 2 * Math.PI;

			// Base
			triangles.push(new Triangle(Handles.getVector(angle1, ARROW_RADIUS_INNER, 0), Vector3.zero(), Handles.getVector(angle2, ARROW_RADIUS_INNER, 0)));
			// Side
			triangles.push(new Triangle(
				Handles.getVector(angle1, ARROW_RADIUS_INNER, 0),
				Handles.getVector(angle2, ARROW_RADIUS_INNER, 0),
				Handles.getVector(angle2, ARROW_RADIUS_INNER, ARROW_LENGTH)));
			triangles.push(new Triangle(
				Handles.getVector(angle1, ARROW_RADIUS_INNER, ARROW_LENGTH),
				Handles.getVector(angle1, ARROW_RADIUS_INNER, 0),
				Handles.getVector(angle2, ARROW_RADIUS_INNER, ARROW_LENGTH)));
			// Tip base
			triangles.push(new Triangle(
				Handles.getVector(angle1, ARROW_RADIUS_INNER, ARROW_LENGTH),
				Handles.getVector(angle2, ARROW_RADIUS_INNER, ARROW_LENGTH),
				Handles.getVector(angle2, ARROW_RADIUS_OUTER, ARROW_LENGTH)));
			triangles.push(new Triangle(
				Handles.getVector(angle1, ARROW_RADIUS_OUTER, ARROW_LENGTH),
				Handles.getVector(angle1, ARROW_RADIUS_INNER, ARROW_LENGTH),
				Handles.getVector(angle2, ARROW_RADIUS_OUTER, ARROW_LENGTH)));
			// Tip
			triangles.push(new Triangle(
				new Vector3(0, 0, ARROW_LENGTH + ARROW_TIP),
				Handles.getVector(angle1, ARROW_RADIUS_OUTER, ARROW_LENGTH),
				Handles.getVector(angle2, ARROW_RADIUS_OUTER, ARROW_LENGTH)));
		}

		return new Mesh(triangles);
	}

	private getRay(axis: Axis): Ray {
		switch (axis) {
			case Axis.X:
				return new Ray(this.position, new Vector3(1, 0, 0));
			case Axis.Y:
				return new Ray(this.position, new Vector3(0, 1, 0));
			case Axis.Z:
				return new Ray(this.position, new Vector3(0, 0, 1));
		}
		throw new Error("Unknown axis: " + axis);
	}

	private getMouseHandle(event: MouseEvent): [Axis, number] {
		var mouseRay = this.camera.getScreenToWorldRay(event.x, event.y);
		for (let axis of [Axis.X, Axis.Y, Axis.Z]) {
			var axisRay = this.getRay(axis);
			if (mouseRay.getDistanceToRay(axisRay) < GRAB_RADIUS) {
				var position = axisRay.getClosestToRay(mouseRay);
				if (Math.abs(position) > GRAB_START && Math.abs(position) < GRAB_END) {
					return [axis, position];
				}
			}
		}
		return [Axis.None, 0];
	}

	onMouseDown(event: MouseEvent): boolean {
		var handleData = this.getMouseHandle(event);
		this.grabbedAxis = handleData[0];
		this.grabbedPosition = handleData[1];		
		return this.grabbedAxis != Axis.None;
	}

	onMouseMove(event: MouseEvent) {
		if (this.grabbedAxis != Axis.None) {
			var mouseRay = this.camera.getScreenToWorldRay(event.x, event.y);
			var axisRay = this.getRay(this.grabbedAxis);
			var mousePosition = axisRay.getClosestToRay(mouseRay);

			this.position = this.position.plus(axisRay.direction.times(mousePosition - this.grabbedPosition));
			this.updateTransforms();
			this.camera.render();
		} else {
			var axis = this.getMouseHandle(event)[0];
			var newAlpha = new Vector3(axis == Axis.X ? 1 : 0.8, axis == Axis.Y ? 1 : 0.8, axis == Axis.Z ? 1 : 0.8);
			if (!newAlpha.equals(this.handleAlpha)) {
				this.handleAlpha = newAlpha;
				this.camera.render();
			}
		}
	}

	onMouseUp() {
		this.grabbedAxis = Axis.None;
	}
}