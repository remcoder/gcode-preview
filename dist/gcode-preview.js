(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
    typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.GCodePreview = {}, global.THREE));
})(this, (function (exports, three) { 'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    const prefix = 'data:image/jpeg;base64,';
    class Thumbnail {
        constructor() {
            this.chars = '';
        }
        static parse(thumbInfo) {
            const thumb = new Thumbnail();
            const infoParts = thumbInfo.split(' ');
            thumb.size = infoParts[0];
            const sizeParts = thumb.size.split('x');
            thumb.width = +sizeParts[0];
            thumb.height = +sizeParts[1];
            thumb.charLength = +infoParts[1];
            return thumb;
        }
        get src() {
            return prefix + this.chars;
        }
        get isValid() {
            // https://stackoverflow.com/questions/475074/regex-to-parse-or-validate-base64-data/475217#475217
            const base64regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
            return this.chars.length == this.charLength && base64regex.test(this.chars);
        }
    }

    /* eslint-disable no-unused-vars */
    class GCodeCommand {
        constructor(src, gcode, params, comment) {
            this.src = src;
            this.gcode = gcode;
            this.params = params;
            this.comment = comment;
        }
    }
    class MoveCommand extends GCodeCommand {
        constructor(src, gcode, params, comment) {
            super(src, gcode, params, comment);
            this.params = params;
        }
    }
    class Layer {
        constructor(layer, commands, lineNumber) {
            this.layer = layer;
            this.commands = commands;
            this.lineNumber = lineNumber;
        }
    }
    class Parser {
        constructor() {
            this.lines = [];
            this.preamble = new Layer(-1, [], 0); // TODO: remove preamble and treat as a regular layer? Unsure of the benefit
            this.layers = [];
            this.curZ = 0;
            this.maxZ = 0;
            this.metadata = { thumbnails: {} };
        }
        parseGCode(input) {
            const lines = Array.isArray(input)
                ? input
                : input.split('\n');
            this.lines = this.lines.concat(lines);
            const commands = this.lines2commands(lines);
            this.groupIntoLayers(commands);
            // merge thumbs
            const thumbs = this.parseMetadata(commands.filter(cmd => cmd.comment)).thumbnails;
            for (const [key, value] of Object.entries(thumbs)) {
                this.metadata.thumbnails[key] = value;
            }
            return { layers: this.layers, metadata: this.metadata };
        }
        lines2commands(lines) {
            return lines
                .map(l => this.parseCommand(l));
        }
        parseCommand(line, keepComments = true) {
            const input = line.trim();
            const splitted = input.split(';');
            const cmd = splitted[0];
            const comment = (keepComments && splitted[1]) || null;
            const parts = cmd.split(/ +/g);
            const gcode = parts[0].toLowerCase();
            let params;
            switch (gcode) {
                case 'g0':
                case 'g00':
                case 'g1':
                case 'g01':
                case 'g2':
                case 'g02':
                case 'g3':
                case 'g03':
                    params = this.parseMove(parts.slice(1));
                    return new MoveCommand(line, gcode, params, comment);
                default:
                    params = this.parseParams(parts.slice(1));
                    // console.warn(`non-move code: ${gcode} ${params}`);
                    return new GCodeCommand(line, gcode, params, comment);
            }
        }
        // G0 & G1
        parseMove(params) {
            return params.reduce((acc, cur) => {
                const key = cur.charAt(0).toLowerCase();
                if (key == 'x' ||
                    key == 'y' ||
                    key == 'z' ||
                    key == 'e' ||
                    key == 'r' ||
                    key == 'f' ||
                    key == 'i' ||
                    key == 'j')
                    acc[key] = parseFloat(cur.slice(1));
                return acc;
            }, {});
        }
        isAlpha(char) {
            const code = char.charCodeAt(0);
            return (code >= 97 && code <= 122) || (code >= 65 && code <= 90);
        }
        parseParams(params) {
            return params.reduce((acc, cur) => {
                const key = cur.charAt(0).toLowerCase();
                if (this.isAlpha(key))
                    acc[key] = parseFloat(cur.slice(1));
                return acc;
            }, {});
        }
        groupIntoLayers(commands) {
            for (let lineNumber = 0; lineNumber < commands.length; lineNumber++) {
                const cmd = commands[lineNumber];
                if (!(cmd instanceof MoveCommand)) {
                    if (this.currentLayer)
                        this.currentLayer.commands.push(cmd);
                    else
                        this.preamble.commands.push(cmd);
                    continue;
                }
                const params = cmd.params;
                if (params.z) {
                    // abs mode
                    this.curZ = params.z;
                }
                if (params.e > 0 &&
                    (params.x != undefined || params.y != undefined) &&
                    this.curZ > this.maxZ) {
                    this.maxZ = this.curZ;
                    this.currentLayer = new Layer(this.layers.length, [cmd], lineNumber);
                    this.layers.push(this.currentLayer);
                    continue;
                }
                if (this.currentLayer)
                    this.currentLayer.commands.push(cmd);
                else
                    this.preamble.commands.push(cmd);
            }
            return this.layers;
        }
        parseMetadata(metadata) {
            const thumbnails = {};
            let thumb = null;
            for (const cmd of metadata) {
                const comment = cmd.comment;
                const idxThumbBegin = comment.indexOf('thumbnail begin');
                const idxThumbEnd = comment.indexOf('thumbnail end');
                if (idxThumbBegin > -1) {
                    thumb = Thumbnail.parse(comment.slice(idxThumbBegin + 15).trim());
                }
                else if (thumb) {
                    if (idxThumbEnd == -1) {
                        thumb.chars += comment.trim();
                    }
                    else {
                        if (thumb.isValid) {
                            thumbnails[thumb.size] = thumb;
                            console.debug('thumb found', thumb.size);
                            console.debug('declared length', thumb.charLength, 'actual length', thumb.chars.length);
                        }
                        else {
                            console.warn('thumb found but seems to be invalid');
                        }
                        thumb = null;
                    }
                }
            }
            return { thumbnails };
        }
    }
    Parser.prototype.parseGcode = Parser.prototype.parseGCode;

    // This set of controls performs orbiting, dollying (zooming), and panning.
    // Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
    //
    //    Orbit - left mouse / touch: one-finger move
    //    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
    //    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

    const _changeEvent = { type: 'change' };
    const _startEvent = { type: 'start' };
    const _endEvent = { type: 'end' };

    class OrbitControls extends three.EventDispatcher {

    	constructor( object, domElement ) {

    		super();

    		this.object = object;
    		this.domElement = domElement;
    		this.domElement.style.touchAction = 'none'; // disable touch scroll

    		// Set to false to disable this control
    		this.enabled = true;

    		// "target" sets the location of focus, where the object orbits around
    		this.target = new three.Vector3();

    		// How far you can dolly in and out ( PerspectiveCamera only )
    		this.minDistance = 0;
    		this.maxDistance = Infinity;

    		// How far you can zoom in and out ( OrthographicCamera only )
    		this.minZoom = 0;
    		this.maxZoom = Infinity;

    		// How far you can orbit vertically, upper and lower limits.
    		// Range is 0 to Math.PI radians.
    		this.minPolarAngle = 0; // radians
    		this.maxPolarAngle = Math.PI; // radians

    		// How far you can orbit horizontally, upper and lower limits.
    		// If set, the interval [ min, max ] must be a sub-interval of [ - 2 PI, 2 PI ], with ( max - min < 2 PI )
    		this.minAzimuthAngle = - Infinity; // radians
    		this.maxAzimuthAngle = Infinity; // radians

    		// Set to true to enable damping (inertia)
    		// If damping is enabled, you must call controls.update() in your animation loop
    		this.enableDamping = false;
    		this.dampingFactor = 0.05;

    		// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
    		// Set to false to disable zooming
    		this.enableZoom = true;
    		this.zoomSpeed = 1.0;

    		// Set to false to disable rotating
    		this.enableRotate = true;
    		this.rotateSpeed = 1.0;

    		// Set to false to disable panning
    		this.enablePan = true;
    		this.panSpeed = 1.0;
    		this.screenSpacePanning = true; // if false, pan orthogonal to world-space direction camera.up
    		this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

    		// Set to true to automatically rotate around the target
    		// If auto-rotate is enabled, you must call controls.update() in your animation loop
    		this.autoRotate = false;
    		this.autoRotateSpeed = 2.0; // 30 seconds per orbit when fps is 60

    		// The four arrow keys
    		this.keys = { LEFT: 'ArrowLeft', UP: 'ArrowUp', RIGHT: 'ArrowRight', BOTTOM: 'ArrowDown' };

    		// Mouse buttons
    		this.mouseButtons = { LEFT: three.MOUSE.ROTATE, MIDDLE: three.MOUSE.DOLLY, RIGHT: three.MOUSE.PAN };

    		// Touch fingers
    		this.touches = { ONE: three.TOUCH.ROTATE, TWO: three.TOUCH.DOLLY_PAN };

    		// for reset
    		this.target0 = this.target.clone();
    		this.position0 = this.object.position.clone();
    		this.zoom0 = this.object.zoom;

    		// the target DOM element for key events
    		this._domElementKeyEvents = null;

    		//
    		// public methods
    		//

    		this.getPolarAngle = function () {

    			return spherical.phi;

    		};

    		this.getAzimuthalAngle = function () {

    			return spherical.theta;

    		};

    		this.getDistance = function () {

    			return this.object.position.distanceTo( this.target );

    		};

    		this.listenToKeyEvents = function ( domElement ) {

    			domElement.addEventListener( 'keydown', onKeyDown );
    			this._domElementKeyEvents = domElement;

    		};

    		this.saveState = function () {

    			scope.target0.copy( scope.target );
    			scope.position0.copy( scope.object.position );
    			scope.zoom0 = scope.object.zoom;

    		};

    		this.reset = function () {

    			scope.target.copy( scope.target0 );
    			scope.object.position.copy( scope.position0 );
    			scope.object.zoom = scope.zoom0;

    			scope.object.updateProjectionMatrix();
    			scope.dispatchEvent( _changeEvent );

    			scope.update();

    			state = STATE.NONE;

    		};

    		// this method is exposed, but perhaps it would be better if we can make it private...
    		this.update = function () {

    			const offset = new three.Vector3();

    			// so camera.up is the orbit axis
    			const quat = new three.Quaternion().setFromUnitVectors( object.up, new three.Vector3( 0, 1, 0 ) );
    			const quatInverse = quat.clone().invert();

    			const lastPosition = new three.Vector3();
    			const lastQuaternion = new three.Quaternion();

    			const twoPI = 2 * Math.PI;

    			return function update() {

    				const position = scope.object.position;

    				offset.copy( position ).sub( scope.target );

    				// rotate offset to "y-axis-is-up" space
    				offset.applyQuaternion( quat );

    				// angle from z-axis around y-axis
    				spherical.setFromVector3( offset );

    				if ( scope.autoRotate && state === STATE.NONE ) {

    					rotateLeft( getAutoRotationAngle() );

    				}

    				if ( scope.enableDamping ) {

    					spherical.theta += sphericalDelta.theta * scope.dampingFactor;
    					spherical.phi += sphericalDelta.phi * scope.dampingFactor;

    				} else {

    					spherical.theta += sphericalDelta.theta;
    					spherical.phi += sphericalDelta.phi;

    				}

    				// restrict theta to be between desired limits

    				let min = scope.minAzimuthAngle;
    				let max = scope.maxAzimuthAngle;

    				if ( isFinite( min ) && isFinite( max ) ) {

    					if ( min < - Math.PI ) min += twoPI; else if ( min > Math.PI ) min -= twoPI;

    					if ( max < - Math.PI ) max += twoPI; else if ( max > Math.PI ) max -= twoPI;

    					if ( min <= max ) {

    						spherical.theta = Math.max( min, Math.min( max, spherical.theta ) );

    					} else {

    						spherical.theta = ( spherical.theta > ( min + max ) / 2 ) ?
    							Math.max( min, spherical.theta ) :
    							Math.min( max, spherical.theta );

    					}

    				}

    				// restrict phi to be between desired limits
    				spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );

    				spherical.makeSafe();


    				spherical.radius *= scale;

    				// restrict radius to be between desired limits
    				spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

    				// move target to panned location

    				if ( scope.enableDamping === true ) {

    					scope.target.addScaledVector( panOffset, scope.dampingFactor );

    				} else {

    					scope.target.add( panOffset );

    				}

    				offset.setFromSpherical( spherical );

    				// rotate offset back to "camera-up-vector-is-up" space
    				offset.applyQuaternion( quatInverse );

    				position.copy( scope.target ).add( offset );

    				scope.object.lookAt( scope.target );

    				if ( scope.enableDamping === true ) {

    					sphericalDelta.theta *= ( 1 - scope.dampingFactor );
    					sphericalDelta.phi *= ( 1 - scope.dampingFactor );

    					panOffset.multiplyScalar( 1 - scope.dampingFactor );

    				} else {

    					sphericalDelta.set( 0, 0, 0 );

    					panOffset.set( 0, 0, 0 );

    				}

    				scale = 1;

    				// update condition is:
    				// min(camera displacement, camera rotation in radians)^2 > EPS
    				// using small-angle approximation cos(x/2) = 1 - x^2 / 8

    				if ( zoomChanged ||
    					lastPosition.distanceToSquared( scope.object.position ) > EPS ||
    					8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

    					scope.dispatchEvent( _changeEvent );

    					lastPosition.copy( scope.object.position );
    					lastQuaternion.copy( scope.object.quaternion );
    					zoomChanged = false;

    					return true;

    				}

    				return false;

    			};

    		}();

    		this.dispose = function () {

    			scope.domElement.removeEventListener( 'contextmenu', onContextMenu );

    			scope.domElement.removeEventListener( 'pointerdown', onPointerDown );
    			scope.domElement.removeEventListener( 'pointercancel', onPointerCancel );
    			scope.domElement.removeEventListener( 'wheel', onMouseWheel );

    			scope.domElement.removeEventListener( 'pointermove', onPointerMove );
    			scope.domElement.removeEventListener( 'pointerup', onPointerUp );


    			if ( scope._domElementKeyEvents !== null ) {

    				scope._domElementKeyEvents.removeEventListener( 'keydown', onKeyDown );

    			}

    			//scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

    		};

    		//
    		// internals
    		//

    		const scope = this;

    		const STATE = {
    			NONE: - 1,
    			ROTATE: 0,
    			DOLLY: 1,
    			PAN: 2,
    			TOUCH_ROTATE: 3,
    			TOUCH_PAN: 4,
    			TOUCH_DOLLY_PAN: 5,
    			TOUCH_DOLLY_ROTATE: 6
    		};

    		let state = STATE.NONE;

    		const EPS = 0.000001;

    		// current position in spherical coordinates
    		const spherical = new three.Spherical();
    		const sphericalDelta = new three.Spherical();

    		let scale = 1;
    		const panOffset = new three.Vector3();
    		let zoomChanged = false;

    		const rotateStart = new three.Vector2();
    		const rotateEnd = new three.Vector2();
    		const rotateDelta = new three.Vector2();

    		const panStart = new three.Vector2();
    		const panEnd = new three.Vector2();
    		const panDelta = new three.Vector2();

    		const dollyStart = new three.Vector2();
    		const dollyEnd = new three.Vector2();
    		const dollyDelta = new three.Vector2();

    		const pointers = [];
    		const pointerPositions = {};

    		function getAutoRotationAngle() {

    			return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

    		}

    		function getZoomScale() {

    			return Math.pow( 0.95, scope.zoomSpeed );

    		}

    		function rotateLeft( angle ) {

    			sphericalDelta.theta -= angle;

    		}

    		function rotateUp( angle ) {

    			sphericalDelta.phi -= angle;

    		}

    		const panLeft = function () {

    			const v = new three.Vector3();

    			return function panLeft( distance, objectMatrix ) {

    				v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix
    				v.multiplyScalar( - distance );

    				panOffset.add( v );

    			};

    		}();

    		const panUp = function () {

    			const v = new three.Vector3();

    			return function panUp( distance, objectMatrix ) {

    				if ( scope.screenSpacePanning === true ) {

    					v.setFromMatrixColumn( objectMatrix, 1 );

    				} else {

    					v.setFromMatrixColumn( objectMatrix, 0 );
    					v.crossVectors( scope.object.up, v );

    				}

    				v.multiplyScalar( distance );

    				panOffset.add( v );

    			};

    		}();

    		// deltaX and deltaY are in pixels; right and down are positive
    		const pan = function () {

    			const offset = new three.Vector3();

    			return function pan( deltaX, deltaY ) {

    				const element = scope.domElement;

    				if ( scope.object.isPerspectiveCamera ) {

    					// perspective
    					const position = scope.object.position;
    					offset.copy( position ).sub( scope.target );
    					let targetDistance = offset.length();

    					// half of the fov is center to top of screen
    					targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

    					// we use only clientHeight here so aspect ratio does not distort speed
    					panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
    					panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );

    				} else if ( scope.object.isOrthographicCamera ) {

    					// orthographic
    					panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
    					panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );

    				} else {

    					// camera neither orthographic nor perspective
    					console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
    					scope.enablePan = false;

    				}

    			};

    		}();

    		function dollyOut( dollyScale ) {

    			if ( scope.object.isPerspectiveCamera ) {

    				scale /= dollyScale;

    			} else if ( scope.object.isOrthographicCamera ) {

    				scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
    				scope.object.updateProjectionMatrix();
    				zoomChanged = true;

    			} else {

    				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
    				scope.enableZoom = false;

    			}

    		}

    		function dollyIn( dollyScale ) {

    			if ( scope.object.isPerspectiveCamera ) {

    				scale *= dollyScale;

    			} else if ( scope.object.isOrthographicCamera ) {

    				scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
    				scope.object.updateProjectionMatrix();
    				zoomChanged = true;

    			} else {

    				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
    				scope.enableZoom = false;

    			}

    		}

    		//
    		// event callbacks - update the object state
    		//

    		function handleMouseDownRotate( event ) {

    			rotateStart.set( event.clientX, event.clientY );

    		}

    		function handleMouseDownDolly( event ) {

    			dollyStart.set( event.clientX, event.clientY );

    		}

    		function handleMouseDownPan( event ) {

    			panStart.set( event.clientX, event.clientY );

    		}

    		function handleMouseMoveRotate( event ) {

    			rotateEnd.set( event.clientX, event.clientY );

    			rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );

    			const element = scope.domElement;

    			rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

    			rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

    			rotateStart.copy( rotateEnd );

    			scope.update();

    		}

    		function handleMouseMoveDolly( event ) {

    			dollyEnd.set( event.clientX, event.clientY );

    			dollyDelta.subVectors( dollyEnd, dollyStart );

    			if ( dollyDelta.y > 0 ) {

    				dollyOut( getZoomScale() );

    			} else if ( dollyDelta.y < 0 ) {

    				dollyIn( getZoomScale() );

    			}

    			dollyStart.copy( dollyEnd );

    			scope.update();

    		}

    		function handleMouseMovePan( event ) {

    			panEnd.set( event.clientX, event.clientY );

    			panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );

    			pan( panDelta.x, panDelta.y );

    			panStart.copy( panEnd );

    			scope.update();

    		}

    		function handleMouseWheel( event ) {

    			if ( event.deltaY < 0 ) {

    				dollyIn( getZoomScale() );

    			} else if ( event.deltaY > 0 ) {

    				dollyOut( getZoomScale() );

    			}

    			scope.update();

    		}

    		function handleKeyDown( event ) {

    			let needsUpdate = false;

    			switch ( event.code ) {

    				case scope.keys.UP:

    					if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

    						rotateUp( 2 * Math.PI * scope.rotateSpeed / scope.domElement.clientHeight );

    					} else {

    						pan( 0, scope.keyPanSpeed );

    					}

    					needsUpdate = true;
    					break;

    				case scope.keys.BOTTOM:

    					if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

    						rotateUp( - 2 * Math.PI * scope.rotateSpeed / scope.domElement.clientHeight );

    					} else {

    						pan( 0, - scope.keyPanSpeed );

    					}

    					needsUpdate = true;
    					break;

    				case scope.keys.LEFT:

    					if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

    						rotateLeft( 2 * Math.PI * scope.rotateSpeed / scope.domElement.clientHeight );

    					} else {

    						pan( scope.keyPanSpeed, 0 );

    					}

    					needsUpdate = true;
    					break;

    				case scope.keys.RIGHT:

    					if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

    						rotateLeft( - 2 * Math.PI * scope.rotateSpeed / scope.domElement.clientHeight );

    					} else {

    						pan( - scope.keyPanSpeed, 0 );

    					}

    					needsUpdate = true;
    					break;

    			}

    			if ( needsUpdate ) {

    				// prevent the browser from scrolling on cursor keys
    				event.preventDefault();

    				scope.update();

    			}


    		}

    		function handleTouchStartRotate() {

    			if ( pointers.length === 1 ) {

    				rotateStart.set( pointers[ 0 ].pageX, pointers[ 0 ].pageY );

    			} else {

    				const x = 0.5 * ( pointers[ 0 ].pageX + pointers[ 1 ].pageX );
    				const y = 0.5 * ( pointers[ 0 ].pageY + pointers[ 1 ].pageY );

    				rotateStart.set( x, y );

    			}

    		}

    		function handleTouchStartPan() {

    			if ( pointers.length === 1 ) {

    				panStart.set( pointers[ 0 ].pageX, pointers[ 0 ].pageY );

    			} else {

    				const x = 0.5 * ( pointers[ 0 ].pageX + pointers[ 1 ].pageX );
    				const y = 0.5 * ( pointers[ 0 ].pageY + pointers[ 1 ].pageY );

    				panStart.set( x, y );

    			}

    		}

    		function handleTouchStartDolly() {

    			const dx = pointers[ 0 ].pageX - pointers[ 1 ].pageX;
    			const dy = pointers[ 0 ].pageY - pointers[ 1 ].pageY;

    			const distance = Math.sqrt( dx * dx + dy * dy );

    			dollyStart.set( 0, distance );

    		}

    		function handleTouchStartDollyPan() {

    			if ( scope.enableZoom ) handleTouchStartDolly();

    			if ( scope.enablePan ) handleTouchStartPan();

    		}

    		function handleTouchStartDollyRotate() {

    			if ( scope.enableZoom ) handleTouchStartDolly();

    			if ( scope.enableRotate ) handleTouchStartRotate();

    		}

    		function handleTouchMoveRotate( event ) {

    			if ( pointers.length == 1 ) {

    				rotateEnd.set( event.pageX, event.pageY );

    			} else {

    				const position = getSecondPointerPosition( event );

    				const x = 0.5 * ( event.pageX + position.x );
    				const y = 0.5 * ( event.pageY + position.y );

    				rotateEnd.set( x, y );

    			}

    			rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );

    			const element = scope.domElement;

    			rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

    			rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

    			rotateStart.copy( rotateEnd );

    		}

    		function handleTouchMovePan( event ) {

    			if ( pointers.length === 1 ) {

    				panEnd.set( event.pageX, event.pageY );

    			} else {

    				const position = getSecondPointerPosition( event );

    				const x = 0.5 * ( event.pageX + position.x );
    				const y = 0.5 * ( event.pageY + position.y );

    				panEnd.set( x, y );

    			}

    			panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );

    			pan( panDelta.x, panDelta.y );

    			panStart.copy( panEnd );

    		}

    		function handleTouchMoveDolly( event ) {

    			const position = getSecondPointerPosition( event );

    			const dx = event.pageX - position.x;
    			const dy = event.pageY - position.y;

    			const distance = Math.sqrt( dx * dx + dy * dy );

    			dollyEnd.set( 0, distance );

    			dollyDelta.set( 0, Math.pow( dollyEnd.y / dollyStart.y, scope.zoomSpeed ) );

    			dollyOut( dollyDelta.y );

    			dollyStart.copy( dollyEnd );

    		}

    		function handleTouchMoveDollyPan( event ) {

    			if ( scope.enableZoom ) handleTouchMoveDolly( event );

    			if ( scope.enablePan ) handleTouchMovePan( event );

    		}

    		function handleTouchMoveDollyRotate( event ) {

    			if ( scope.enableZoom ) handleTouchMoveDolly( event );

    			if ( scope.enableRotate ) handleTouchMoveRotate( event );

    		}

    		//
    		// event handlers - FSM: listen for events and reset state
    		//

    		function onPointerDown( event ) {

    			if ( scope.enabled === false ) return;

    			if ( pointers.length === 0 ) {

    				scope.domElement.setPointerCapture( event.pointerId );

    				scope.domElement.addEventListener( 'pointermove', onPointerMove );
    				scope.domElement.addEventListener( 'pointerup', onPointerUp );

    			}

    			//

    			addPointer( event );

    			if ( event.pointerType === 'touch' ) {

    				onTouchStart( event );

    			} else {

    				onMouseDown( event );

    			}

    		}

    		function onPointerMove( event ) {

    			if ( scope.enabled === false ) return;

    			if ( event.pointerType === 'touch' ) {

    				onTouchMove( event );

    			} else {

    				onMouseMove( event );

    			}

    		}

    		function onPointerUp( event ) {

    		    removePointer( event );

    		    if ( pointers.length === 0 ) {

    		        scope.domElement.releasePointerCapture( event.pointerId );

    		        scope.domElement.removeEventListener( 'pointermove', onPointerMove );
    		        scope.domElement.removeEventListener( 'pointerup', onPointerUp );

    		    }

    		    scope.dispatchEvent( _endEvent );

    		    state = STATE.NONE;

    		}

    		function onPointerCancel( event ) {

    			removePointer( event );

    		}

    		function onMouseDown( event ) {

    			let mouseAction;

    			switch ( event.button ) {

    				case 0:

    					mouseAction = scope.mouseButtons.LEFT;
    					break;

    				case 1:

    					mouseAction = scope.mouseButtons.MIDDLE;
    					break;

    				case 2:

    					mouseAction = scope.mouseButtons.RIGHT;
    					break;

    				default:

    					mouseAction = - 1;

    			}

    			switch ( mouseAction ) {

    				case three.MOUSE.DOLLY:

    					if ( scope.enableZoom === false ) return;

    					handleMouseDownDolly( event );

    					state = STATE.DOLLY;

    					break;

    				case three.MOUSE.ROTATE:

    					if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

    						if ( scope.enablePan === false ) return;

    						handleMouseDownPan( event );

    						state = STATE.PAN;

    					} else {

    						if ( scope.enableRotate === false ) return;

    						handleMouseDownRotate( event );

    						state = STATE.ROTATE;

    					}

    					break;

    				case three.MOUSE.PAN:

    					if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

    						if ( scope.enableRotate === false ) return;

    						handleMouseDownRotate( event );

    						state = STATE.ROTATE;

    					} else {

    						if ( scope.enablePan === false ) return;

    						handleMouseDownPan( event );

    						state = STATE.PAN;

    					}

    					break;

    				default:

    					state = STATE.NONE;

    			}

    			if ( state !== STATE.NONE ) {

    				scope.dispatchEvent( _startEvent );

    			}

    		}

    		function onMouseMove( event ) {

    			switch ( state ) {

    				case STATE.ROTATE:

    					if ( scope.enableRotate === false ) return;

    					handleMouseMoveRotate( event );

    					break;

    				case STATE.DOLLY:

    					if ( scope.enableZoom === false ) return;

    					handleMouseMoveDolly( event );

    					break;

    				case STATE.PAN:

    					if ( scope.enablePan === false ) return;

    					handleMouseMovePan( event );

    					break;

    			}

    		}

    		function onMouseWheel( event ) {

    			if ( scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE ) return;

    			event.preventDefault();

    			scope.dispatchEvent( _startEvent );

    			handleMouseWheel( event );

    			scope.dispatchEvent( _endEvent );

    		}

    		function onKeyDown( event ) {

    			if ( scope.enabled === false || scope.enablePan === false ) return;

    			handleKeyDown( event );

    		}

    		function onTouchStart( event ) {

    			trackPointer( event );

    			switch ( pointers.length ) {

    				case 1:

    					switch ( scope.touches.ONE ) {

    						case three.TOUCH.ROTATE:

    							if ( scope.enableRotate === false ) return;

    							handleTouchStartRotate();

    							state = STATE.TOUCH_ROTATE;

    							break;

    						case three.TOUCH.PAN:

    							if ( scope.enablePan === false ) return;

    							handleTouchStartPan();

    							state = STATE.TOUCH_PAN;

    							break;

    						default:

    							state = STATE.NONE;

    					}

    					break;

    				case 2:

    					switch ( scope.touches.TWO ) {

    						case three.TOUCH.DOLLY_PAN:

    							if ( scope.enableZoom === false && scope.enablePan === false ) return;

    							handleTouchStartDollyPan();

    							state = STATE.TOUCH_DOLLY_PAN;

    							break;

    						case three.TOUCH.DOLLY_ROTATE:

    							if ( scope.enableZoom === false && scope.enableRotate === false ) return;

    							handleTouchStartDollyRotate();

    							state = STATE.TOUCH_DOLLY_ROTATE;

    							break;

    						default:

    							state = STATE.NONE;

    					}

    					break;

    				default:

    					state = STATE.NONE;

    			}

    			if ( state !== STATE.NONE ) {

    				scope.dispatchEvent( _startEvent );

    			}

    		}

    		function onTouchMove( event ) {

    			trackPointer( event );

    			switch ( state ) {

    				case STATE.TOUCH_ROTATE:

    					if ( scope.enableRotate === false ) return;

    					handleTouchMoveRotate( event );

    					scope.update();

    					break;

    				case STATE.TOUCH_PAN:

    					if ( scope.enablePan === false ) return;

    					handleTouchMovePan( event );

    					scope.update();

    					break;

    				case STATE.TOUCH_DOLLY_PAN:

    					if ( scope.enableZoom === false && scope.enablePan === false ) return;

    					handleTouchMoveDollyPan( event );

    					scope.update();

    					break;

    				case STATE.TOUCH_DOLLY_ROTATE:

    					if ( scope.enableZoom === false && scope.enableRotate === false ) return;

    					handleTouchMoveDollyRotate( event );

    					scope.update();

    					break;

    				default:

    					state = STATE.NONE;

    			}

    		}

    		function onContextMenu( event ) {

    			if ( scope.enabled === false ) return;

    			event.preventDefault();

    		}

    		function addPointer( event ) {

    			pointers.push( event );

    		}

    		function removePointer( event ) {

    			delete pointerPositions[ event.pointerId ];

    			for ( let i = 0; i < pointers.length; i ++ ) {

    				if ( pointers[ i ].pointerId == event.pointerId ) {

    					pointers.splice( i, 1 );
    					return;

    				}

    			}

    		}

    		function trackPointer( event ) {

    			let position = pointerPositions[ event.pointerId ];

    			if ( position === undefined ) {

    				position = new three.Vector2();
    				pointerPositions[ event.pointerId ] = position;

    			}

    			position.set( event.pageX, event.pageY );

    		}

    		function getSecondPointerPosition( event ) {

    			const pointer = ( event.pointerId === pointers[ 0 ].pointerId ) ? pointers[ 1 ] : pointers[ 0 ];

    			return pointerPositions[ pointer.pointerId ];

    		}

    		//

    		scope.domElement.addEventListener( 'contextmenu', onContextMenu );

    		scope.domElement.addEventListener( 'pointerdown', onPointerDown );
    		scope.domElement.addEventListener( 'pointercancel', onPointerCancel );
    		scope.domElement.addEventListener( 'wheel', onMouseWheel, { passive: false } );

    		// force an update at start

    		this.update();

    	}

    }

    /**
     * parameters = {
     *  color: <hex>,
     *  linewidth: <float>,
     *  dashed: <boolean>,
     *  dashScale: <float>,
     *  dashSize: <float>,
     *  dashOffset: <float>,
     *  gapSize: <float>,
     *  resolution: <Vector2>, // to be set by renderer
     * }
     */


    three.UniformsLib.line = {

    	worldUnits: { value: 1 },
    	linewidth: { value: 1 },
    	resolution: { value: new three.Vector2( 1, 1 ) },
    	dashOffset: { value: 0 },
    	dashScale: { value: 1 },
    	dashSize: { value: 1 },
    	gapSize: { value: 1 } // todo FIX - maybe change to totalSize

    };

    three.ShaderLib[ 'line' ] = {

    	uniforms: three.UniformsUtils.merge( [
    		three.UniformsLib.common,
    		three.UniformsLib.fog,
    		three.UniformsLib.line
    	] ),

    	vertexShader:
    	/* glsl */`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				// get the offset direction as perpendicular to the view vector
				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 offset;
				if ( position.y < 0.5 ) {

					offset = normalize( cross( start.xyz, worldDir ) );

				} else {

					offset = normalize( cross( end.xyz, worldDir ) );

				}

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// extend the line bounds to encompass  endcaps
					start.xyz += - worldDir * linewidth * 0.5;
					end.xyz += worldDir * linewidth * 0.5;

					// shift the position of the quad so it hugs the forward edge of the line
					offset.xy -= dir * forwardOffset;
					offset.z += 0.5;

				#endif

				// endcaps
				if ( position.y > 1.0 || position.y < 0.0 ) {

					offset.xy += dir * 2.0 * forwardOffset;

				}

				// adjust for linewidth
				offset *= linewidth * 0.5;

				// set the world position
				worldPos = ( position.y < 0.5 ) ? start : end;
				worldPos.xyz += offset;

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,

    	fragmentShader:
    	/* glsl */`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			float alpha = opacity;

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <encodings_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`
    };

    class LineMaterial extends three.ShaderMaterial {

    	constructor( parameters ) {

    		super( {

    			type: 'LineMaterial',

    			uniforms: three.UniformsUtils.clone( three.ShaderLib[ 'line' ].uniforms ),

    			vertexShader: three.ShaderLib[ 'line' ].vertexShader,
    			fragmentShader: three.ShaderLib[ 'line' ].fragmentShader,

    			clipping: true // required for clipping support

    		} );

    		this.isLineMaterial = true;

    		Object.defineProperties( this, {

    			color: {

    				enumerable: true,

    				get: function () {

    					return this.uniforms.diffuse.value;

    				},

    				set: function ( value ) {

    					this.uniforms.diffuse.value = value;

    				}

    			},

    			worldUnits: {

    				enumerable: true,

    				get: function () {

    					return 'WORLD_UNITS' in this.defines;

    				},

    				set: function ( value ) {

    					if ( value === true ) {

    						this.defines.WORLD_UNITS = '';

    					} else {

    						delete this.defines.WORLD_UNITS;

    					}

    				}

    			},

    			linewidth: {

    				enumerable: true,

    				get: function () {

    					return this.uniforms.linewidth.value;

    				},

    				set: function ( value ) {

    					this.uniforms.linewidth.value = value;

    				}

    			},

    			dashed: {

    				enumerable: true,

    				get: function () {

    					return Boolean( 'USE_DASH' in this.defines );

    				},

    				set( value ) {

    					if ( Boolean( value ) !== Boolean( 'USE_DASH' in this.defines ) ) {

    						this.needsUpdate = true;

    					}

    					if ( value === true ) {

    						this.defines.USE_DASH = '';

    					} else {

    						delete this.defines.USE_DASH;

    					}

    				}

    			},

    			dashScale: {

    				enumerable: true,

    				get: function () {

    					return this.uniforms.dashScale.value;

    				},

    				set: function ( value ) {

    					this.uniforms.dashScale.value = value;

    				}

    			},

    			dashSize: {

    				enumerable: true,

    				get: function () {

    					return this.uniforms.dashSize.value;

    				},

    				set: function ( value ) {

    					this.uniforms.dashSize.value = value;

    				}

    			},

    			dashOffset: {

    				enumerable: true,

    				get: function () {

    					return this.uniforms.dashOffset.value;

    				},

    				set: function ( value ) {

    					this.uniforms.dashOffset.value = value;

    				}

    			},

    			gapSize: {

    				enumerable: true,

    				get: function () {

    					return this.uniforms.gapSize.value;

    				},

    				set: function ( value ) {

    					this.uniforms.gapSize.value = value;

    				}

    			},

    			opacity: {

    				enumerable: true,

    				get: function () {

    					return this.uniforms.opacity.value;

    				},

    				set: function ( value ) {

    					this.uniforms.opacity.value = value;

    				}

    			},

    			resolution: {

    				enumerable: true,

    				get: function () {

    					return this.uniforms.resolution.value;

    				},

    				set: function ( value ) {

    					this.uniforms.resolution.value.copy( value );

    				}

    			},

    			alphaToCoverage: {

    				enumerable: true,

    				get: function () {

    					return Boolean( 'USE_ALPHA_TO_COVERAGE' in this.defines );

    				},

    				set: function ( value ) {

    					if ( Boolean( value ) !== Boolean( 'USE_ALPHA_TO_COVERAGE' in this.defines ) ) {

    						this.needsUpdate = true;

    					}

    					if ( value === true ) {

    						this.defines.USE_ALPHA_TO_COVERAGE = '';
    						this.extensions.derivatives = true;

    					} else {

    						delete this.defines.USE_ALPHA_TO_COVERAGE;
    						this.extensions.derivatives = false;

    					}

    				}

    			}

    		} );

    		this.setValues( parameters );

    	}

    }

    const _box$1 = new three.Box3();
    const _vector = new three.Vector3();

    class LineSegmentsGeometry extends three.InstancedBufferGeometry {

    	constructor() {

    		super();

    		this.isLineSegmentsGeometry = true;

    		this.type = 'LineSegmentsGeometry';

    		const positions = [ - 1, 2, 0, 1, 2, 0, - 1, 1, 0, 1, 1, 0, - 1, 0, 0, 1, 0, 0, - 1, - 1, 0, 1, - 1, 0 ];
    		const uvs = [ - 1, 2, 1, 2, - 1, 1, 1, 1, - 1, - 1, 1, - 1, - 1, - 2, 1, - 2 ];
    		const index = [ 0, 2, 1, 2, 3, 1, 2, 4, 3, 4, 5, 3, 4, 6, 5, 6, 7, 5 ];

    		this.setIndex( index );
    		this.setAttribute( 'position', new three.Float32BufferAttribute( positions, 3 ) );
    		this.setAttribute( 'uv', new three.Float32BufferAttribute( uvs, 2 ) );

    	}

    	applyMatrix4( matrix ) {

    		const start = this.attributes.instanceStart;
    		const end = this.attributes.instanceEnd;

    		if ( start !== undefined ) {

    			start.applyMatrix4( matrix );

    			end.applyMatrix4( matrix );

    			start.needsUpdate = true;

    		}

    		if ( this.boundingBox !== null ) {

    			this.computeBoundingBox();

    		}

    		if ( this.boundingSphere !== null ) {

    			this.computeBoundingSphere();

    		}

    		return this;

    	}

    	setPositions( array ) {

    		let lineSegments;

    		if ( array instanceof Float32Array ) {

    			lineSegments = array;

    		} else if ( Array.isArray( array ) ) {

    			lineSegments = new Float32Array( array );

    		}

    		const instanceBuffer = new three.InstancedInterleavedBuffer( lineSegments, 6, 1 ); // xyz, xyz

    		this.setAttribute( 'instanceStart', new three.InterleavedBufferAttribute( instanceBuffer, 3, 0 ) ); // xyz
    		this.setAttribute( 'instanceEnd', new three.InterleavedBufferAttribute( instanceBuffer, 3, 3 ) ); // xyz

    		//

    		this.computeBoundingBox();
    		this.computeBoundingSphere();

    		return this;

    	}

    	setColors( array ) {

    		let colors;

    		if ( array instanceof Float32Array ) {

    			colors = array;

    		} else if ( Array.isArray( array ) ) {

    			colors = new Float32Array( array );

    		}

    		const instanceColorBuffer = new three.InstancedInterleavedBuffer( colors, 6, 1 ); // rgb, rgb

    		this.setAttribute( 'instanceColorStart', new three.InterleavedBufferAttribute( instanceColorBuffer, 3, 0 ) ); // rgb
    		this.setAttribute( 'instanceColorEnd', new three.InterleavedBufferAttribute( instanceColorBuffer, 3, 3 ) ); // rgb

    		return this;

    	}

    	fromWireframeGeometry( geometry ) {

    		this.setPositions( geometry.attributes.position.array );

    		return this;

    	}

    	fromEdgesGeometry( geometry ) {

    		this.setPositions( geometry.attributes.position.array );

    		return this;

    	}

    	fromMesh( mesh ) {

    		this.fromWireframeGeometry( new three.WireframeGeometry( mesh.geometry ) );

    		// set colors, maybe

    		return this;

    	}

    	fromLineSegments( lineSegments ) {

    		const geometry = lineSegments.geometry;

    		this.setPositions( geometry.attributes.position.array ); // assumes non-indexed

    		// set colors, maybe

    		return this;

    	}

    	computeBoundingBox() {

    		if ( this.boundingBox === null ) {

    			this.boundingBox = new three.Box3();

    		}

    		const start = this.attributes.instanceStart;
    		const end = this.attributes.instanceEnd;

    		if ( start !== undefined && end !== undefined ) {

    			this.boundingBox.setFromBufferAttribute( start );

    			_box$1.setFromBufferAttribute( end );

    			this.boundingBox.union( _box$1 );

    		}

    	}

    	computeBoundingSphere() {

    		if ( this.boundingSphere === null ) {

    			this.boundingSphere = new three.Sphere();

    		}

    		if ( this.boundingBox === null ) {

    			this.computeBoundingBox();

    		}

    		const start = this.attributes.instanceStart;
    		const end = this.attributes.instanceEnd;

    		if ( start !== undefined && end !== undefined ) {

    			const center = this.boundingSphere.center;

    			this.boundingBox.getCenter( center );

    			let maxRadiusSq = 0;

    			for ( let i = 0, il = start.count; i < il; i ++ ) {

    				_vector.fromBufferAttribute( start, i );
    				maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( _vector ) );

    				_vector.fromBufferAttribute( end, i );
    				maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( _vector ) );

    			}

    			this.boundingSphere.radius = Math.sqrt( maxRadiusSq );

    			if ( isNaN( this.boundingSphere.radius ) ) {

    				console.error( 'THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.', this );

    			}

    		}

    	}

    	toJSON() {

    		// todo

    	}

    	applyMatrix( matrix ) {

    		console.warn( 'THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4().' );

    		return this.applyMatrix4( matrix );

    	}

    }

    class LineGeometry extends LineSegmentsGeometry {

    	constructor() {

    		super();

    		this.isLineGeometry = true;

    		this.type = 'LineGeometry';

    	}

    	setPositions( array ) {

    		// converts [ x1, y1, z1,  x2, y2, z2, ... ] to pairs format

    		const length = array.length - 3;
    		const points = new Float32Array( 2 * length );

    		for ( let i = 0; i < length; i += 3 ) {

    			points[ 2 * i ] = array[ i ];
    			points[ 2 * i + 1 ] = array[ i + 1 ];
    			points[ 2 * i + 2 ] = array[ i + 2 ];

    			points[ 2 * i + 3 ] = array[ i + 3 ];
    			points[ 2 * i + 4 ] = array[ i + 4 ];
    			points[ 2 * i + 5 ] = array[ i + 5 ];

    		}

    		super.setPositions( points );

    		return this;

    	}

    	setColors( array ) {

    		// converts [ r1, g1, b1,  r2, g2, b2, ... ] to pairs format

    		const length = array.length - 3;
    		const colors = new Float32Array( 2 * length );

    		for ( let i = 0; i < length; i += 3 ) {

    			colors[ 2 * i ] = array[ i ];
    			colors[ 2 * i + 1 ] = array[ i + 1 ];
    			colors[ 2 * i + 2 ] = array[ i + 2 ];

    			colors[ 2 * i + 3 ] = array[ i + 3 ];
    			colors[ 2 * i + 4 ] = array[ i + 4 ];
    			colors[ 2 * i + 5 ] = array[ i + 5 ];

    		}

    		super.setColors( colors );

    		return this;

    	}

    	fromLine( line ) {

    		const geometry = line.geometry;

    		this.setPositions( geometry.attributes.position.array ); // assumes non-indexed

    		// set colors, maybe

    		return this;

    	}

    }

    const _start = new three.Vector3();
    const _end = new three.Vector3();

    const _start4 = new three.Vector4();
    const _end4 = new three.Vector4();

    const _ssOrigin = new three.Vector4();
    const _ssOrigin3 = new three.Vector3();
    const _mvMatrix = new three.Matrix4();
    const _line = new three.Line3();
    const _closestPoint = new three.Vector3();

    const _box = new three.Box3();
    const _sphere = new three.Sphere();
    const _clipToWorldVector = new three.Vector4();

    let _ray, _lineWidth;

    // Returns the margin required to expand by in world space given the distance from the camera,
    // line width, resolution, and camera projection
    function getWorldSpaceHalfWidth( camera, distance, resolution ) {

    	// transform into clip space, adjust the x and y values by the pixel width offset, then
    	// transform back into world space to get world offset. Note clip space is [-1, 1] so full
    	// width does not need to be halved.
    	_clipToWorldVector.set( 0, 0, - distance, 1.0 ).applyMatrix4( camera.projectionMatrix );
    	_clipToWorldVector.multiplyScalar( 1.0 / _clipToWorldVector.w );
    	_clipToWorldVector.x = _lineWidth / resolution.width;
    	_clipToWorldVector.y = _lineWidth / resolution.height;
    	_clipToWorldVector.applyMatrix4( camera.projectionMatrixInverse );
    	_clipToWorldVector.multiplyScalar( 1.0 / _clipToWorldVector.w );

    	return Math.abs( Math.max( _clipToWorldVector.x, _clipToWorldVector.y ) );

    }

    function raycastWorldUnits( lineSegments, intersects ) {

    	const matrixWorld = lineSegments.matrixWorld;
    	const geometry = lineSegments.geometry;
    	const instanceStart = geometry.attributes.instanceStart;
    	const instanceEnd = geometry.attributes.instanceEnd;
    	const segmentCount = Math.min( geometry.instanceCount, instanceStart.count );

    	for ( let i = 0, l = segmentCount; i < l; i ++ ) {

    		_line.start.fromBufferAttribute( instanceStart, i );
    		_line.end.fromBufferAttribute( instanceEnd, i );

    		_line.applyMatrix4( matrixWorld );

    		const pointOnLine = new three.Vector3();
    		const point = new three.Vector3();

    		_ray.distanceSqToSegment( _line.start, _line.end, point, pointOnLine );
    		const isInside = point.distanceTo( pointOnLine ) < _lineWidth * 0.5;

    		if ( isInside ) {

    			intersects.push( {
    				point,
    				pointOnLine,
    				distance: _ray.origin.distanceTo( point ),
    				object: lineSegments,
    				face: null,
    				faceIndex: i,
    				uv: null,
    				uv2: null,
    			} );

    		}

    	}

    }

    function raycastScreenSpace( lineSegments, camera, intersects ) {

    	const projectionMatrix = camera.projectionMatrix;
    	const material = lineSegments.material;
    	const resolution = material.resolution;
    	const matrixWorld = lineSegments.matrixWorld;

    	const geometry = lineSegments.geometry;
    	const instanceStart = geometry.attributes.instanceStart;
    	const instanceEnd = geometry.attributes.instanceEnd;
    	const segmentCount = Math.min( geometry.instanceCount, instanceStart.count );

    	const near = - camera.near;

    	//

    	// pick a point 1 unit out along the ray to avoid the ray origin
    	// sitting at the camera origin which will cause "w" to be 0 when
    	// applying the projection matrix.
    	_ray.at( 1, _ssOrigin );

    	// ndc space [ - 1.0, 1.0 ]
    	_ssOrigin.w = 1;
    	_ssOrigin.applyMatrix4( camera.matrixWorldInverse );
    	_ssOrigin.applyMatrix4( projectionMatrix );
    	_ssOrigin.multiplyScalar( 1 / _ssOrigin.w );

    	// screen space
    	_ssOrigin.x *= resolution.x / 2;
    	_ssOrigin.y *= resolution.y / 2;
    	_ssOrigin.z = 0;

    	_ssOrigin3.copy( _ssOrigin );

    	_mvMatrix.multiplyMatrices( camera.matrixWorldInverse, matrixWorld );

    	for ( let i = 0, l = segmentCount; i < l; i ++ ) {

    		_start4.fromBufferAttribute( instanceStart, i );
    		_end4.fromBufferAttribute( instanceEnd, i );

    		_start4.w = 1;
    		_end4.w = 1;

    		// camera space
    		_start4.applyMatrix4( _mvMatrix );
    		_end4.applyMatrix4( _mvMatrix );

    		// skip the segment if it's entirely behind the camera
    		const isBehindCameraNear = _start4.z > near && _end4.z > near;
    		if ( isBehindCameraNear ) {

    			continue;

    		}

    		// trim the segment if it extends behind camera near
    		if ( _start4.z > near ) {

    			const deltaDist = _start4.z - _end4.z;
    			const t = ( _start4.z - near ) / deltaDist;
    			_start4.lerp( _end4, t );

    		} else if ( _end4.z > near ) {

    			const deltaDist = _end4.z - _start4.z;
    			const t = ( _end4.z - near ) / deltaDist;
    			_end4.lerp( _start4, t );

    		}

    		// clip space
    		_start4.applyMatrix4( projectionMatrix );
    		_end4.applyMatrix4( projectionMatrix );

    		// ndc space [ - 1.0, 1.0 ]
    		_start4.multiplyScalar( 1 / _start4.w );
    		_end4.multiplyScalar( 1 / _end4.w );

    		// screen space
    		_start4.x *= resolution.x / 2;
    		_start4.y *= resolution.y / 2;

    		_end4.x *= resolution.x / 2;
    		_end4.y *= resolution.y / 2;

    		// create 2d segment
    		_line.start.copy( _start4 );
    		_line.start.z = 0;

    		_line.end.copy( _end4 );
    		_line.end.z = 0;

    		// get closest point on ray to segment
    		const param = _line.closestPointToPointParameter( _ssOrigin3, true );
    		_line.at( param, _closestPoint );

    		// check if the intersection point is within clip space
    		const zPos = three.MathUtils.lerp( _start4.z, _end4.z, param );
    		const isInClipSpace = zPos >= - 1 && zPos <= 1;

    		const isInside = _ssOrigin3.distanceTo( _closestPoint ) < _lineWidth * 0.5;

    		if ( isInClipSpace && isInside ) {

    			_line.start.fromBufferAttribute( instanceStart, i );
    			_line.end.fromBufferAttribute( instanceEnd, i );

    			_line.start.applyMatrix4( matrixWorld );
    			_line.end.applyMatrix4( matrixWorld );

    			const pointOnLine = new three.Vector3();
    			const point = new three.Vector3();

    			_ray.distanceSqToSegment( _line.start, _line.end, point, pointOnLine );

    			intersects.push( {
    				point: point,
    				pointOnLine: pointOnLine,
    				distance: _ray.origin.distanceTo( point ),
    				object: lineSegments,
    				face: null,
    				faceIndex: i,
    				uv: null,
    				uv2: null,
    			} );

    		}

    	}

    }

    class LineSegments2 extends three.Mesh {

    	constructor( geometry = new LineSegmentsGeometry(), material = new LineMaterial( { color: Math.random() * 0xffffff } ) ) {

    		super( geometry, material );

    		this.isLineSegments2 = true;

    		this.type = 'LineSegments2';

    	}

    	// for backwards-compatibility, but could be a method of LineSegmentsGeometry...

    	computeLineDistances() {

    		const geometry = this.geometry;

    		const instanceStart = geometry.attributes.instanceStart;
    		const instanceEnd = geometry.attributes.instanceEnd;
    		const lineDistances = new Float32Array( 2 * instanceStart.count );

    		for ( let i = 0, j = 0, l = instanceStart.count; i < l; i ++, j += 2 ) {

    			_start.fromBufferAttribute( instanceStart, i );
    			_end.fromBufferAttribute( instanceEnd, i );

    			lineDistances[ j ] = ( j === 0 ) ? 0 : lineDistances[ j - 1 ];
    			lineDistances[ j + 1 ] = lineDistances[ j ] + _start.distanceTo( _end );

    		}

    		const instanceDistanceBuffer = new three.InstancedInterleavedBuffer( lineDistances, 2, 1 ); // d0, d1

    		geometry.setAttribute( 'instanceDistanceStart', new three.InterleavedBufferAttribute( instanceDistanceBuffer, 1, 0 ) ); // d0
    		geometry.setAttribute( 'instanceDistanceEnd', new three.InterleavedBufferAttribute( instanceDistanceBuffer, 1, 1 ) ); // d1

    		return this;

    	}

    	raycast( raycaster, intersects ) {

    		const worldUnits = this.material.worldUnits;
    		const camera = raycaster.camera;

    		if ( camera === null && ! worldUnits ) {

    			console.error( 'LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.' );

    		}

    		const threshold = ( raycaster.params.Line2 !== undefined ) ? raycaster.params.Line2.threshold || 0 : 0;

    		_ray = raycaster.ray;

    		const matrixWorld = this.matrixWorld;
    		const geometry = this.geometry;
    		const material = this.material;

    		_lineWidth = material.linewidth + threshold;

    		// check if we intersect the sphere bounds
    		if ( geometry.boundingSphere === null ) {

    			geometry.computeBoundingSphere();

    		}

    		_sphere.copy( geometry.boundingSphere ).applyMatrix4( matrixWorld );

    		// increase the sphere bounds by the worst case line screen space width
    		let sphereMargin;
    		if ( worldUnits ) {

    			sphereMargin = _lineWidth * 0.5;

    		} else {

    			const distanceToSphere = Math.max( camera.near, _sphere.distanceToPoint( _ray.origin ) );
    			sphereMargin = getWorldSpaceHalfWidth( camera, distanceToSphere, material.resolution );

    		}

    		_sphere.radius += sphereMargin;

    		if ( _ray.intersectsSphere( _sphere ) === false ) {

    			return;

    		}

    		// check if we intersect the box bounds
    		if ( geometry.boundingBox === null ) {

    			geometry.computeBoundingBox();

    		}

    		_box.copy( geometry.boundingBox ).applyMatrix4( matrixWorld );

    		// increase the box bounds by the worst case line width
    		let boxMargin;
    		if ( worldUnits ) {

    			boxMargin = _lineWidth * 0.5;

    		} else {

    			const distanceToBox = Math.max( camera.near, _box.distanceToPoint( _ray.origin ) );
    			boxMargin = getWorldSpaceHalfWidth( camera, distanceToBox, material.resolution );

    		}

    		_box.expandByScalar( boxMargin );

    		if ( _ray.intersectsBox( _box ) === false ) {

    			return;

    		}

    		if ( worldUnits ) {

    			raycastWorldUnits( this, intersects );

    		} else {

    			raycastScreenSpace( this, camera, intersects );

    		}

    	}

    }

    class GridHelper extends three.LineSegments {
        constructor(sizeX, stepX, sizeZ, stepZ, color1 = 0x444444, color2 = 0x888888) {
            color1 = new three.Color(color1);
            color2 = new three.Color(color2);
            const x = Math.round(sizeX / stepX);
            const y = Math.round(sizeZ / stepZ);
            sizeX = x * stepX / 2;
            sizeZ = y * stepZ / 2;
            const vertices = [];
            const colors = [];
            let j = 0;
            for (let i = -1 * sizeX; i <= sizeX; i += stepX) {
                vertices.push(i, 0, -1 * sizeZ, //x Y z
                i, 0, sizeZ //x Y z
                );
                const color = i === 0 ? color1 : color2;
                color.toArray(colors, j);
                j += 3;
                color.toArray(colors, j);
                j += 3;
                color.toArray(colors, j);
                j += 3;
                color.toArray(colors, j);
                j += 3;
            }
            for (let i = -1 * sizeZ; i <= sizeZ; i += stepZ) {
                vertices.push(-1 * sizeX, 0, i, //x Y z
                sizeX, 0, i //x Y z
                );
                const color = i === 0 ? color1 : color2;
                color.toArray(colors, j);
                j += 3;
                color.toArray(colors, j);
                j += 3;
                color.toArray(colors, j);
                j += 3;
                color.toArray(colors, j);
                j += 3;
            }
            const geometry = new three.BufferGeometry();
            geometry.setAttribute('position', new three.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('color', new three.Float32BufferAttribute(colors, 3));
            const material = new three.LineBasicMaterial({ vertexColors: true, toneMapped: false });
            super(geometry, material);
            // this.type = 'BuildVolume';
        }
    }

    function box(width, height, depth) {
        width = width * 0.5,
            height = height * 0.5,
            depth = depth * 0.5;
        const geometry = new three.BufferGeometry();
        const position = [];
        position.push(-width, -height, -depth, -width, height, -depth, -width, height, -depth, width, height, -depth, width, height, -depth, width, -height, -depth, width, -height, -depth, -width, -height, -depth, -width, -height, depth, -width, height, depth, -width, height, depth, width, height, depth, width, height, depth, width, -height, depth, width, -height, depth, -width, -height, depth, -width, -height, -depth, -width, -height, depth, -width, height, -depth, -width, height, depth, width, height, -depth, width, height, depth, width, -height, -depth, width, -height, depth);
        geometry.setAttribute('position', new three.Float32BufferAttribute(position, 3));
        return geometry;
    }
    function LineBox(x, y, z, color) {
        const geometryBox = box(x, y, z);
        const lineSegments = new three.LineSegments(geometryBox, new three.LineDashedMaterial({ color: new three.Color(color), dashSize: 3, gapSize: 1 }));
        lineSegments.computeLineDistances();
        return lineSegments;
    }

    class WebGLPreview {
        constructor(opts) {
            var _a, _b, _c;
            this.parser = new Parser();
            this.backgroundColor = 0xe0e0e0;
            this.travelColor = 0x990000;
            this.extrusionColor = 0x00ff00;
            this.renderExtrusion = true;
            this.renderTravel = false;
            this.singleLayerMode = false;
            this.initialCameraPosition = [-100, 400, 450];
            this.debug = false;
            this.allowDragNDrop = false;
            this.beyondFirstMove = false;
            this.inches = false;
            this.disposables = [];
            this.scene = new three.Scene();
            this.scene.background = new three.Color(this.backgroundColor);
            this.canvas = opts.canvas;
            this.targetId = opts.targetId;
            // this.endLayer = opts.limit;
            this.endLayer = opts.endLayer;
            this.startLayer = opts.startLayer;
            this.topLayerColor = opts.topLayerColor;
            this.lastSegmentColor = opts.lastSegmentColor;
            this.lineWidth = opts.lineWidth;
            this.buildVolume = opts.buildVolume;
            this.initialCameraPosition = (_a = opts.initialCameraPosition) !== null && _a !== void 0 ? _a : this.initialCameraPosition;
            this.debug = (_b = opts.debug) !== null && _b !== void 0 ? _b : this.debug;
            this.allowDragNDrop = (_c = opts.allowDragNDrop) !== null && _c !== void 0 ? _c : this.allowDragNDrop;
            console.info('Using THREE r' + three.REVISION);
            console.debug('opts', opts);
            if (this.targetId) {
                console.warn('`targetId` is deprecated and will removed in the future. Use `canvas` instead.');
            }
            if (!this.canvas && !this.targetId) {
                throw Error('Set either opts.canvas or opts.targetId');
            }
            if (!this.canvas) {
                const container = document.getElementById(this.targetId);
                if (!container)
                    throw new Error('Unable to find element ' + this.targetId);
                this.renderer = new three.WebGLRenderer({ preserveDrawingBuffer: true });
                this.canvas = this.renderer.domElement;
                container.appendChild(this.canvas);
            }
            else {
                this.renderer = new three.WebGLRenderer({
                    canvas: this.canvas,
                    preserveDrawingBuffer: true
                });
            }
            this.camera = new three.PerspectiveCamera(25, this.canvas.offsetWidth / this.canvas.offsetHeight, 10, 5000);
            this.camera.position.fromArray(this.initialCameraPosition);
            const fogFar = this.camera.far;
            const fogNear = fogFar * 0.8;
            this.scene.fog = new three.Fog(this.scene.background, fogNear, fogFar);
            this.resize();
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.animate();
            if (this.allowDragNDrop)
                this._enableDropHandler();
        }
        get layers() {
            return this.parser.layers.concat(this.parser.preamble);
        }
        // convert from 1-based to 0-based
        get maxLayerIndex() {
            var _a;
            return ((_a = this.endLayer) !== null && _a !== void 0 ? _a : this.layers.length) - 1;
        }
        // convert from 1-based to 0-based
        get minLayerIndex() {
            var _a;
            return this.singleLayerMode ? this.maxLayerIndex : ((_a = this.startLayer) !== null && _a !== void 0 ? _a : 0) - 1;
        }
        animate() {
            requestAnimationFrame(() => this.animate());
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        }
        processGCode(gcode) {
            this.parser.parseGCode(gcode);
            this.render();
        }
        render() {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
            while (this.disposables.length > 0) {
                this.disposables.pop().dispose();
            }
            if (this.debug) {
                // show webgl axes
                const axesHelper = new three.AxesHelper(Math.max(this.buildVolume.x / 2, this.buildVolume.y / 2) + 20);
                this.scene.add(axesHelper);
            }
            if (this.buildVolume) {
                this.drawBuildVolume();
            }
            this.group = new three.Group();
            this.group.name = 'gcode';
            const state = { x: 0, y: 0, z: 0, r: 0, e: 0, i: 0, j: 0 };
            for (let index = 0; index < this.layers.length; index++) {
                if (index > this.maxLayerIndex)
                    break;
                const currentLayer = {
                    extrusion: [],
                    travel: [],
                    z: state.z,
                };
                const l = this.layers[index];
                for (const cmd of l.commands) {
                    if (cmd.gcode == 'g20') {
                        this.setInches();
                    }
                    else if (['g0', 'g00', 'g1', 'g01', 'g2', 'g02', 'g3', 'g03'].indexOf(cmd.gcode) > -1) {
                        const g = cmd;
                        const next = {
                            x: (_a = g.params.x) !== null && _a !== void 0 ? _a : state.x,
                            y: (_b = g.params.y) !== null && _b !== void 0 ? _b : state.y,
                            z: (_c = g.params.z) !== null && _c !== void 0 ? _c : state.z,
                            r: (_d = g.params.r) !== null && _d !== void 0 ? _d : state.r,
                            e: (_e = g.params.e) !== null && _e !== void 0 ? _e : state.e,
                            i: (_f = g.params.i) !== null && _f !== void 0 ? _f : state.i,
                            j: (_g = g.params.j) !== null && _g !== void 0 ? _g : state.j,
                        };
                        if (index >= this.minLayerIndex) {
                            const extrude = g.params.e > 0;
                            if ((extrude && this.renderExtrusion) ||
                                (!extrude && this.renderTravel)) {
                                if (cmd.gcode == 'g2' || cmd.gcode == 'g3' || cmd.gcode == 'g02' || cmd.gcode == 'g03') {
                                    this.addArcSegment(currentLayer, state, next, extrude, cmd.gcode == 'g2' || cmd.gcode == 'g02');
                                }
                                else {
                                    this.addLineSegment(currentLayer, state, next, extrude);
                                }
                            }
                        }
                        // update state
                        if (next.x)
                            state.x = next.x;
                        if (next.y)
                            state.y = next.y;
                        if (next.z)
                            state.z = next.z;
                        if (next.r)
                            state.r = next.r;
                        if (next.e)
                            state.e = next.e;
                        state.i = 0;
                        state.j = 0;
                        if (!this.beyondFirstMove)
                            this.beyondFirstMove = true;
                    }
                }
                if (this.renderExtrusion) {
                    const brightness = Math.round((80 * index) / this.layers.length);
                    const extrusionColor = new three.Color(`hsl(0, 0%, ${brightness}%)`).getHex();
                    if (index == this.layers.length - 1) {
                        const layerColor = (_h = this.topLayerColor) !== null && _h !== void 0 ? _h : extrusionColor;
                        const lastSegmentColor = (_j = this.lastSegmentColor) !== null && _j !== void 0 ? _j : layerColor;
                        const endPoint = currentLayer.extrusion.splice(-3);
                        this.addLine(currentLayer.extrusion, layerColor);
                        const preendPoint = currentLayer.extrusion.splice(-3);
                        this.addLine([...preendPoint, ...endPoint], lastSegmentColor);
                    }
                    else {
                        this.addLine(currentLayer.extrusion, extrusionColor);
                    }
                }
                if (this.renderTravel) {
                    this.addLine(currentLayer.travel, this.travelColor);
                }
            }
            this.group.quaternion.setFromEuler(new three.Euler(-Math.PI / 2, 0, 0));
            if (this.buildVolume) {
                this.group.position.set(-this.buildVolume.x / 2, 0, this.buildVolume.y / 2);
            }
            else {
                // FIXME: this is just a very crude approximation for centering
                this.group.position.set(-100, 0, 100);
            }
            this.scene.add(this.group);
            this.renderer.render(this.scene, this.camera);
        }
        setInches() {
            if (this.beyondFirstMove) {
                console.warn('Switching units after movement is already made is discouraged and is not supported.');
                return;
            }
            this.inches = true;
            console.log('Units set to inches');
        }
        drawBuildVolume() {
            this.scene.add(new GridHelper(this.buildVolume.x, 10, this.buildVolume.y, 10));
            const geometryBox = LineBox(this.buildVolume.x, this.buildVolume.z, this.buildVolume.y, 0x888888);
            geometryBox.position.setY(this.buildVolume.z / 2);
            this.scene.add(geometryBox);
        }
        clear() {
            this.startLayer = 1;
            this.endLayer = Infinity;
            this.singleLayerMode = false;
            this.parser = new Parser();
        }
        resize() {
            const [w, h] = [this.canvas.offsetWidth, this.canvas.offsetHeight];
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(w, h, false);
        }
        addLineSegment(layer, p1, p2, extrude) {
            const line = extrude ? layer.extrusion : layer.travel;
            line.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
        addArcSegment(layer, p1, p2, extrude, cw) {
            const line = extrude ? layer.extrusion : layer.travel;
            const currX = p1.x, currY = p1.y, currZ = p1.z, x = p2.x, y = p2.y, z = p2.z;
            let r = p2.r;
            let i = p2.i, j = p2.j;
            if (r) { // in r mode a minimum radius will be applied if the distance can otherwise not be bridged
                const deltaX = x - currX; // assume abs mode
                const deltaY = y - currY;
                // apply a minimal radius to bridge the distance
                const minR = Math.sqrt(Math.pow(deltaX / 2, 2) + Math.pow(deltaY / 2, 2));
                r = Math.max(r, minR);
                const dSquared = Math.pow(deltaX, 2) + Math.pow(deltaY, 2);
                const hSquared = Math.pow(r, 2) - dSquared / 4;
                // if (dSquared == 0 || hSquared < 0) {
                //   return { position: { x: x, y: z, z: y }, points: [] }; //we'll abort the render and move te position to the new position.
                // }
                let hDivD = Math.sqrt(hSquared / dSquared);
                // Ref RRF DoArcMove for details
                if ((cw && r < 0.0) || (!cw && r > 0.0)) {
                    hDivD = -hDivD;
                }
                i = deltaX / 2 + deltaY * hDivD;
                j = deltaY / 2 - deltaX * hDivD;
                // } else {
                //     //the radial point is an offset from the current position
                //     ///Need at least on point
                //     if (i == 0 && j == 0) {
                //         return { position: { x: x, y: y, z: z }, points: [] }; //we'll abort the render and move te position to the new position.
                //     }
            }
            const wholeCircle = currX == i && currY == y;
            const centerX = currX + i;
            const centerY = currY + j;
            const arcRadius = Math.sqrt(i * i + j * j);
            const arcCurrentAngle = Math.atan2(-j, -i);
            const finalTheta = Math.atan2(y - centerY, x - centerX);
            let totalArc;
            if (wholeCircle) {
                totalArc = 2 * Math.PI;
            }
            else {
                totalArc = cw
                    ? arcCurrentAngle - finalTheta
                    : finalTheta - arcCurrentAngle;
                if (totalArc < 0.0) {
                    totalArc += 2 * Math.PI;
                }
            }
            let totalSegments = (arcRadius * totalArc) / 1.8; //arcSegLength + 0.8;
            if (this.inches) {
                totalSegments *= 25;
            }
            if (totalSegments < 1) {
                totalSegments = 1;
            }
            let arcAngleIncrement = totalArc / totalSegments;
            arcAngleIncrement *= cw ? -1 : 1;
            const points = [];
            points.push({ x: currX, y: currY, z: currZ });
            const zDist = currZ - z;
            const zStep = zDist / totalSegments;
            //get points for the arc
            let px = currX;
            let py = currY;
            let pz = currZ;
            //calculate segments
            let currentAngle = arcCurrentAngle;
            for (let moveIdx = 0; moveIdx < totalSegments - 1; moveIdx++) {
                currentAngle += arcAngleIncrement;
                px = centerX + arcRadius * Math.cos(currentAngle);
                py = centerY + arcRadius * Math.sin(currentAngle);
                pz += zStep;
                points.push({ x: px, y: py, z: pz });
            }
            points.push({ x: p2.x, y: p2.y, z: p2.z });
            for (let idx = 0; idx < points.length - 1; idx++) {
                line.push(points[idx].x, points[idx].y, points[idx].z, points[idx + 1].x, points[idx + 1].y, points[idx + 1].z);
            }
        }
        addLine(vertices, color) {
            if (typeof this.lineWidth === 'number' && this.lineWidth > 0) {
                this.addThickLine(vertices, color);
                return;
            }
            const geometry = new three.BufferGeometry();
            geometry.setAttribute('position', new three.Float32BufferAttribute(vertices, 3));
            this.disposables.push(geometry);
            const material = new three.LineBasicMaterial({ color: color });
            this.disposables.push(material);
            const lineSegments = new three.LineSegments(geometry, material);
            this.group.add(lineSegments);
        }
        addThickLine(vertices, color) {
            if (!vertices.length)
                return;
            const geometry = new LineGeometry();
            this.disposables.push(geometry);
            const matLine = new LineMaterial({
                color: color,
                linewidth: this.lineWidth / (1000 * window.devicePixelRatio)
            });
            this.disposables.push(matLine);
            geometry.setPositions(vertices);
            const line = new LineSegments2(geometry, matLine);
            this.group.add(line);
        }
        // experimental DnD support
        _enableDropHandler() {
            this.canvas.addEventListener('dragover', (evt) => {
                evt.stopPropagation();
                evt.preventDefault();
                evt.dataTransfer.dropEffect = 'copy';
                this.canvas.classList.add('dragging');
            });
            this.canvas.addEventListener('dragleave', (evt) => {
                evt.stopPropagation();
                evt.preventDefault();
                this.canvas.classList.remove('dragging');
            });
            this.canvas.addEventListener('drop', (evt) => __awaiter(this, void 0, void 0, function* () {
                evt.stopPropagation();
                evt.preventDefault();
                this.canvas.classList.remove('dragging');
                const files = evt.dataTransfer.files;
                const file = files[0];
                this.clear();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                yield this._readFromStream(file.stream());
                this.render();
            }));
        }
        _readFromStream(stream) {
            var _a, _b;
            return __awaiter(this, void 0, void 0, function* () {
                const reader = stream.getReader();
                let result;
                let tail = '';
                let size = 0;
                do {
                    result = yield reader.read();
                    size += (_b = (_a = result.value) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
                    const str = decode(result.value);
                    const idxNewLine = str.lastIndexOf('\n');
                    const maxFullLine = str.slice(0, idxNewLine);
                    // parse increments but don't render yet
                    this.parser.parseGCode(tail + maxFullLine);
                    tail = str.slice(idxNewLine);
                } while (!result.done);
                console.debug('read from stream', size);
            });
        }
    }
    function decode(uint8array) {
        return new TextDecoder('utf-8').decode(uint8array);
    }

    const init = function (opts) { return new WebGLPreview(opts); };

    exports.WebGLPreview = WebGLPreview;
    exports.init = init;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
