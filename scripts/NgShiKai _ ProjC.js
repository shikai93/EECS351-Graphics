
// lightMode 1:Gouraud Phong, 2:Gouraud Blin Phong, 3:Phong Phong, 4:Phong Blin Phong
var VSHADER_SOURCE =
	
	//--------------- GLSL Struct Definitions:
	'struct MatlT {\n' +		// Describes one Phong material by its reflectances:
	'		vec3 emit;\n' +			// Ke: emissive -- surface 'glow' amount (r,g,b);
	'		vec3 ambi;\n' +			// Ka: ambient reflectance (r,g,b)
	'		vec3 diff;\n' +			// Kd: diffuse reflectance (r,g,b)
	'		vec3 spec;\n' + 		// Ks: specular reflectance (r,g,b)
	'		int shiny;\n' +			// Kshiny: specular exponent (integer >= 1; typ. <200)
	'		};\n' +
  	'struct LampT {\n' +		// Describes one point-like Phong light source
	'		vec3 pos;\n' +			// (x,y,z,w); w==1.0 for local light at x,y,z position
	' 		vec3 ambi;\n' +			// Ia ==  ambient light source strength (r,g,b)
	' 		vec3 diff;\n' +			// Id ==  diffuse light source strength (r,g,b)
	'		vec3 spec;\n' +			// Is == specular light source strength (r,g,b)
	'		}; \n' +
	//-------------ATTRIBUTES of each vertex, read from our Vertex Buffer Object
	  'attribute vec4 a_Position; \n' +		// vertex position (model coord sys)
	  'attribute vec4 a_Normal; \n' +			// vertex normal vector (model coord sys)
	//-------------UNIFORMS: values set from JavaScript before a drawing command.
	'uniform MatlT u_MatlSet[1];\n' +		// Array of all materials.
	'uniform mat4 u_MvpMatrix; \n' +
	'uniform mat4 u_ViewMatrix;\n' +
	'uniform mat4 u_ProjMatrix;\n' +
	'uniform mat4 u_ModelMatrix; \n' + 		// Model matrix
	'uniform mat4 u_NormalMatrix; \n' +  	// Inverse Transpose of ModelMatrix;
	//-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
	'varying vec3 v_Kd; \n' +							// Phong Lighting: diffuse reflectance
	'varying vec4 v_Position; \n' +				
	'varying vec3 v_Normal; \n' +					// Why Vec3? its not a point, hence w==0
	'varying vec4 v_Color;\n' +
	
	'uniform LampT u_LampSet[2];\n' +		// Array of all light sources.
	'uniform vec3 u_eyePosWorld; \n' + 	// Camera/eye location in world coords.
	
	'uniform int lightMode;\n' +
	//-----------------------------------------------------------------------------
	'void main() { \n' +
		// Compute CVV coordinate values from our given vertex. This 'built-in'
		// 'varying' value gets interpolated to set screen position for each pixel.
	'  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
		// Calculate the vertex position & normal vec in the WORLD coordinate system
		// for use as a 'varying' variable: fragment shaders get per-pixel values
		// (interpolated between vertices for our drawing primitive (TRIANGLE)).
	'  v_Position = u_ModelMatrix * a_Position; \n' +
	'  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal)); \n'+
	'  v_Normal = normal;\n' +
	'  v_Kd = u_MatlSet[0].diff; \n' +		// find per-pixel diffuse reflectance from per-vertex
	' if(lightMode == 1 || lightMode == 2){\n'+
	//Gouraud shading
	//calc lighting per vertex
	'   vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
	'   vec3 lightDirection2 = normalize(u_LampSet[1].pos - v_Position.xyz);\n' +
	'   vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +
	'   float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
	'   float nDotL2 = max(dot(lightDirection2, normal), 0.0); \n' +
	'   float e64,e642; \n' +
	//phong lighting
	'    if(lightMode == 1){\n' +
	'      vec3 R = reflect(-lightDirection, normal);\n' +
	'      vec3 R2 = reflect(-lightDirection2, normal);\n'	+	
	'      float rDotV = max(dot(R, eyeDirection), 0.0);\n' +
	'      float rDotV2 = max(dot(R2, eyeDirection), 0.0);\n' +
	'      e64 = pow(rDotV, float(u_MatlSet[0].shiny)/4.0);\n' +
	'      e642 = pow(rDotV2, float(u_MatlSet[0].shiny)/4.0);\n' +
	'    } else {\n' +
	'   		vec3 H = normalize(lightDirection + eyeDirection); \n' +
	'   		vec3 H2 = normalize(lightDirection2 + eyeDirection); \n' +
	'   		float nDotH = max(dot(H, normal), 0.0); \n' +
	'   		float nDotH2 = max(dot(H2, normal), 0.0); \n' +
	'   		e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
	'   		e642 = pow(nDotH2, float(u_MatlSet[0].shiny));\n}\n' +
	'		vec3 emissive = u_MatlSet[0].emit;' +
	'   vec3 ambient = ( u_LampSet[0].ambi + u_LampSet[1].ambi) * u_MatlSet[0].ambi;\n' +
	'   vec3 diffuse = ( u_LampSet[0].diff * nDotL + u_LampSet[1].diff * nDotL2) * 0.5 * v_Kd;\n' +
	'		vec3 speculr = (u_LampSet[0].spec * e64 + u_LampSet[1].spec * e642) * u_MatlSet[0].spec ;\n' +
	'   v_Color = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
	' 	}\n'+
  '}\n';
  
//=============================================================================
// Fragment shader program
//=============================================================================
var FSHADER_SOURCE =
	//-------------Set precision.
	// GLSL-ES 2.0 defaults (from spec; '4.5.3 Default Precision Qualifiers'):
	// DEFAULT for Vertex Shaders: 	precision highp float; precision highp int;
	//									precision lowp sampler2D; precision lowp samplerCube;
	// DEFAULT for Fragment Shaders:  UNDEFINED for float; precision mediump int;
	//									precision lowp sampler2D;	precision lowp samplerCube;
	// MATCH the Vertex shader precision for float and int:
  'precision highp float;\n' +
  'precision highp int;\n' +
  //
	//--------------- GLSL Struct Definitions:
	'struct LampT {\n' +		// Describes one point-like Phong light source
	'		vec3 pos;\n' +			// (x,y,z,w); w==1.0 for local light at x,y,z position
	' 		vec3 ambi;\n' +			// Ia ==  ambient light source strength (r,g,b)
	' 		vec3 diff;\n' +			// Id ==  diffuse light source strength (r,g,b)
	'		vec3 spec;\n' +			// Is == specular light source strength (r,g,b)
	'		}; \n' +
	//
	'struct MatlT {\n' +		// Describes one Phong material by its reflectances:
	'		vec3 emit;\n' +			// Ke: emissive -- surface 'glow' amount (r,g,b);
	'		vec3 ambi;\n' +			// Ka: ambient reflectance (r,g,b)
	'		vec3 diff;\n' +			// Kd: diffuse reflectance (r,g,b)
	'		vec3 spec;\n' + 		// Ks: specular reflectance (r,g,b)
	'		int shiny;\n' +			// Kshiny: specular exponent (integer >= 1; typ. <200)
	'		};\n' +
  //
	//-------------UNIFORMS: values set from JavaScript before a drawing command.
  // first light source: (YOU write a second one...)
	'uniform LampT u_LampSet[2];\n' +		// Array of all light sources.
	'uniform MatlT u_MatlSet[1];\n' +		// Array of all materials.
	
	'uniform int lightMode;\n' +
// OLD first material definition: you write 2nd, 3rd, etc.
//  'uniform vec3 u_Ke;\n' +						// Phong Reflectance: emissive
//  'uniform vec3 u_Ka;\n' +						// Phong Reflectance: ambient
	// no Phong Reflectance: diffuse? -- no: use v_Kd instead for per-pixel value
//  'uniform vec3 u_Ks;\n' +						// Phong Reflectance: specular
//  'uniform int u_Kshiny;\n' +				// Phong Reflectance: 1 < shiny < 128
//
  'uniform vec3 u_eyePosWorld; \n' + 	// Camera/eye location in world coords.
  
 	//-------------VARYING:Vertex Shader values sent per-pix'''''''''''''''';el to Fragment shader: 
  'varying vec3 v_Normal;\n' +				// Find 3D surface normal at each pix
  'varying vec4 v_Position;\n' +			// pixel's 3D pos too -- in 'world' coords
  'varying vec4 v_Color;\n' +
  'varying vec3 v_Kd;	\n' +						// Find diffuse reflectance K_d per pix
  													// Ambient? Emissive? Specular? almost
  													// NEVER change per-vertex: I use 'uniform' values

  'void main() { \n' +
    // Normalize! !!IMPORTANT!! TROUBLE if you don't!
	// Gouraud shading
	'  if(lightMode == 1 || lightMode == 2){\n' +
	'  gl_FragColor = v_Color;\n' +
	'  } else { \n' +
	//Phong shading
	'  vec3 normal = normalize(v_Normal); \n' +
	'  vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
	'  vec3 lightDirection2 = normalize(u_LampSet[1].pos - v_Position.xyz);\n' +
	'  vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +
	'  float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
	'  float nDotL2 = max(dot(lightDirection2, normal), 0.0); \n' +
	'  float e64, e642; \n' +
	//Phong lighting
	'    if (lightMode == 3) {\n' +
  '      vec3 R = reflect(-lightDirection, normal);\n' +
  '      vec3 R2 = reflect(-lightDirection2, normal);\n' +
  '      float rDotV = max(dot(R, eyeDirection), 0.0);\n' +
  '      float rDotV2 = max(dot(R2, eyeDirection), 0.0);\n' +
  '      e64 = pow(rDotV, float(u_MatlSet[0].shiny)/4.0);\n' +
  '      e642 = pow(rDotV2, float(u_MatlSet[0].shiny)/4.0);\n' +
  '    }\n' +
  '    else {\n' +
	'  		vec3 H = normalize(lightDirection + eyeDirection); \n' +
	'  		vec3 H2 = normalize(lightDirection2 + eyeDirection); \n' +
	'  		float nDotH = max(dot(H, normal), 0.0); \n' +
	'  		float nDotH2 = max(dot(H2, normal), 0.0); \n' +
	'  		e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
	'  		e642 = pow(nDotH2, float(u_MatlSet[0].shiny));\n}\n' +
	'		vec3 emissive = u_MatlSet[0].emit;' +
	'   vec3 ambient = ( u_LampSet[0].ambi + u_LampSet[1].ambi) * u_MatlSet[0].ambi;\n' +
	'   vec3 diffuse = ( u_LampSet[0].diff * nDotL + u_LampSet[1].diff * nDotL2) * 0.5 * v_Kd;\n' +
	'		vec3 speculr = (u_LampSet[0].spec * e64 + u_LampSet[1].spec * e642) * u_MatlSet[0].spec ;\n' +
	'   gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);}\n' +
	'}\n';


// Global Variable -- Rotation angle rate (degrees/second)
var ANGLE_STEP = 40.0;
var SPEED = 1;
var SCALE = 1;
var ANGLE_STEP_3D = 10;

// Global vars for mouse click-and-drag for rotation.
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var isInViewPort = false;
var yMclik=0.0, xMclick=0.0;   
var g_EyeX = 0, g_EyeY = 2.2, g_EyeZ = 7;
var lookat_X = 0, lookat_Y = 2, lookat_Z = 6;
var rad = 0;

//Global vars for lighting
//		-- For 3D scene:
var u_eyePosWorld 	= false;

// ... for Phong material/reflectance:
var uLoc_Ke = false;
var uLoc_Ka = false;
var uLoc_Kd = false;
var uLoc_Ks = false;
var uLoc_Kshiny = false;

//Global vars for canvas
var canvas 	= false;
var gl 			= false;

/// ///  ... for our camera:
var	eyePosWorld = new Float32Array(3);	// x,y,z in world coords

//	... for our first light source:   (stays false if never initialized)
var lamp0 = new LightsT();
var lamp1 = new LightsT();
var lamp1On = true;
var lamp0On = true;
var ambientRGB = [0.4, 0.4, 0.4];
var diffuseRGB = [0, 1, 0];
var specRGB = [0, 1, 0];
var lamp1pos = [0, 5, 5];

	// ... for our first material:
var matlSel= (21)%MATL_DEFAULT;
var matlSel2 = (2)%MATL_DEFAULT;
var matlSel3 = (22)%MATL_DEFAULT;
var matlSel4 = (6)%MATL_DEFAULT;
var matl0 = new Material(matlSel);
var matl1 = new Material(matlSel2);
var matl2 = new Material(matlSel3);
var matl3 = new Material(matlSel4);

var modeSelected = 3;

anglesEnum = {
  REC_STICK_ANGLE : 0,
  Z_ANGLE : 1,
};

directionEnum = {
	Right : 1,
	Left : -1,
	Forward : 1,
	Backward : -1,
};

dirEnum = {
	Right : 0,
	Left : 1,
	Up : 2,
	Down : 3,
	Forward : 4,
	Backward : 5,
};

modeEnum = {
	GP : 1,
	GB : 2,
	PP : 3,
	PB : 4,
};

var floatsPerVertex = 9;	// # of Float32Array elements used for each vertex
var currentAngle = 0.0;

function main() {
//==============================================================================
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
	gl.depthFunc(gl.LESS);
  gl.enable(gl.DEPTH_TEST); 

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  
  // Write the positions of vertices to a vertex shader
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }
  
  lightMode = gl.getUniformLocation(gl.program, 'lightMode');
   if (!lightMode) { 
    console.log('Failed to Get the storage locations of lighting modes');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0, 0, 0, 1);
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ViewMatrix || !u_ProjMatrix || !u_ModelMatrix) { 
    console.log('Failed to get u_ViewMatrix or u_ProjMatrix');
    return;
  }
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if(!u_NormalMatrix) {
		console.log('Failed to get GPU storage location for u_NormalMatrix');
		return;
  }
  // Create the matrix to specify the viewing volume and pass it to u_ProjMatrix
  var projMatrix = new Matrix4();
  var  modelMatrix = new Matrix4();
  var normalMatrix = new Matrix4();

  // Current rotation angle
  var zAngle = 0.0;
  var tetraAngle = 0.0;
  var viewMatrix = new Matrix4();
  
  canvas.onmousedown= function(ev){myMouseDown( ev, gl, canvas) }; 
  					// when user's mouse button goes down call mouseDown() function
  canvas.onmousemove = function(ev){myMouseMove( ev, gl, canvas) };
											// call mouseMove() function					
  canvas.onmouseup = function(ev){myMouseUp( ev, gl, canvas)};

  window.addEventListener("keydown", myKeyDown, false);
  window.addEventListener("keyup", myKeyUp, false);
	
	//BPhong light with phong shading
	u_eyePosWorld  = gl.getUniformLocation(gl.program, 'u_eyePosWorld');
  if (!u_eyePosWorld) {
  	console.log('Failed to get GPUs matrix storage locations');
  	return;
  	}
	//  ... for Phong light source:
	// NEW!  Note we're getting the location of a GLSL struct array member:

  lamp0.u_pos  = gl.getUniformLocation(gl.program, 'u_LampSet[0].pos');	
  lamp0.u_ambi = gl.getUniformLocation(gl.program, 'u_LampSet[0].ambi');
  lamp0.u_diff = gl.getUniformLocation(gl.program, 'u_LampSet[0].diff');
  lamp0.u_spec = gl.getUniformLocation(gl.program, 'u_LampSet[0].spec');
  if( !lamp0.u_pos || !lamp0.u_ambi	|| !lamp0.u_diff || !lamp0.u_spec	) {
    console.log('Failed to get GPUs Lamp0 storage locations');
    return;
  }
  
  lamp1.u_pos  = gl.getUniformLocation(gl.program, 'u_LampSet[1].pos');	
  lamp1.u_ambi = gl.getUniformLocation(gl.program, 'u_LampSet[1].ambi');
  lamp1.u_diff = gl.getUniformLocation(gl.program, 'u_LampSet[1].diff');
  lamp1.u_spec = gl.getUniformLocation(gl.program, 'u_LampSet[1].spec');
  if( !lamp0.u_pos || !lamp0.u_ambi	|| !lamp0.u_diff || !lamp0.u_spec	) {
    console.log('Failed to get GPUs Lamp0 storage locations');
    return;
  }

	uLoc_Ke = gl.getUniformLocation(gl.program, 'u_MatlSet[0].emit');
	uLoc_Ka = gl.getUniformLocation(gl.program, 'u_MatlSet[0].ambi');
	uLoc_Kd = gl.getUniformLocation(gl.program, 'u_MatlSet[0].diff');
	uLoc_Ks = gl.getUniformLocation(gl.program, 'u_MatlSet[0].spec');
	uLoc_Kshiny = gl.getUniformLocation(gl.program, 'u_MatlSet[0].shiny');
	
	if(!uLoc_Ke || !uLoc_Ka || !uLoc_Kd || !uLoc_Ks || !uLoc_Kshiny) {
		console.log('Failed to get GPUs Reflectance storage locations');
		return;
  }
	
   //Start drawing
  var tick = function() {
    // Calculate the elapsed time
    var now = Date.now();
    var elapsed = now - g_last;
      
	gl.uniform1i(lightMode, modeSelected);
    SCALE = elapsed % 10;
    SCALE = currentAngle/90;
    currentAngle = animate(currentAngle, anglesEnum.REC_STICK_ANGLE, elapsed);  // Update the rotation angle
    zAngle = animate(zAngle, anglesEnum.Z_ANGLE, elapsed);
	  tetraAngle = (tetraAngle + ANGLE_STEP_3D *elapsed/250) % 360;
	  drawBPwP(gl, u_ViewMatrix, viewMatrix, currentAngle, zAngle, tetraAngle, normalMatrix, u_NormalMatrix, projMatrix, u_ProjMatrix, modelMatrix, u_ModelMatrix);
    g_last = now;
    requestAnimationFrame(tick, canvas);   // Request that the browser ?calls tick
  };
  tick();
}

function drawBPwP(gl, u_ViewMatrix, viewMatrix, currentAngle, zAngle, tetraAngle, normalMatrix, u_NormalMatrix, projMatrix, u_ProjMatrix, modelMatrix, u_ModelMatrix) {
	
	lamp0.I_pos.elements.set([g_EyeX, g_EyeY, g_EyeZ]);
	if (lamp0On) {
		lamp0.I_ambi.elements.set([0.4,0.4, 0.4]);
		lamp0.I_diff.elements.set([1.0, 1.0, 1.0]);
		lamp0.I_spec.elements.set([1.0, 1.0, 1.0]);
	} else {
		lamp0.I_ambi.elements.set([0, 0, 0]);
		lamp0.I_diff.elements.set([0, 0, 0]);
		lamp0.I_spec.elements.set([0, 0, 0]);
	}
	gl.uniform3fv(lamp0.u_pos,  lamp0.I_pos.elements.slice(0,3));
	gl.uniform3fv(lamp0.u_ambi, lamp0.I_ambi.elements);		// ambient
	gl.uniform3fv(lamp0.u_diff, lamp0.I_diff.elements);		// diffuse
	gl.uniform3fv(lamp0.u_spec, lamp0.I_spec.elements);		// Specular
	
	ambientRGB[0] = document.getElementById('ambientR').value / 255;
	ambientRGB[1] = document.getElementById('ambientG').value / 255;
	ambientRGB[2] = document.getElementById('ambientB').value / 255;
	
	diffuseRGB[0] = document.getElementById('diffuseR').value / 255;
	diffuseRGB[1] = document.getElementById('diffuseG').value / 255;
	diffuseRGB[2] = document.getElementById('diffuseB').value / 255;

	specRGB[0] = document.getElementById('specR').value / 255;
	specRGB[1] = document.getElementById('specG').value / 255;
	specRGB[2] = document.getElementById('specB').value / 255;

	lamp1.I_pos.elements.set(lamp1pos);
	if (lamp1On) {
		lamp1.I_ambi.elements.set(ambientRGB);
		lamp1.I_diff.elements.set(diffuseRGB);
		lamp1.I_spec.elements.set(specRGB);
	} else {
		lamp1.I_ambi.elements.set([0, 0, 0]);
		lamp1.I_diff.elements.set([0, 0, 0]);
		lamp1.I_spec.elements.set([0, 0, 0]);
	}

	gl.uniform3fv(lamp1.u_pos,  lamp1.I_pos.elements.slice(0,3));
	gl.uniform3fv(lamp1.u_ambi, lamp1.I_ambi.elements);		// ambient
	gl.uniform3fv(lamp1.u_diff, lamp1.I_diff.elements);		// diffuse
	gl.uniform3fv(lamp1.u_spec, lamp1.I_spec.elements);		// Specular
	
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(u_eyePosWorld, eyePosWorld);// use it to set our uniform

	gl.uniform3fv(uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	gl.uniform1i(uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny

	draw(gl, u_ViewMatrix, viewMatrix, currentAngle, zAngle, tetraAngle, normalMatrix, u_NormalMatrix, projMatrix, u_ProjMatrix, modelMatrix, u_ModelMatrix);
}

function initVertexBuffers(gl) {
//==============================================================================

  jointedObjectVertices = new Float32Array ([
    //rectangular strips
     -0.05, 0.65, 0.00,	   1.0, 1.0, 0.0,   0, 0, 1,   // topleft triangle   (x,y,z) (r,g,b) surf norm
     0.00, 0.65, 0.00,     1.0, 1.0, 1.0,   0, 0, 1, 
     -0.05, 0.30, 0.00,    1.0, 1.0, 0.0,   0, 0, 1, 
     -0.05, 0.30, 0.00,    1.0,  0.0, 0.0,	0, 0, 1, //topmiddle triangle 
     0.05, 0.30, 0.00,     1.0,  0.0, 0.0,  0, 0, 1,  
     0.00, 0.65, 0.00,     1.0,  1.0, 1.0,  0, 0, 1, 
     0.00, 0.65, 0.00,	   1.0, 1.0, 1.0,   0, 0, 1,     // topright triangle   (x,y,z,w==1)
     0.05, 0.65, 0.00,     1.0, 1.0, 0.0,   0, 0, 1, 
     0.05, 0.30, 0.00,     1.0, 1.0, 0.0,    0, 0, 1, 
     -0.05, -0.05, 0.00,	 1.0, 1.0, 0.0,   0, 0, 1,     // btmleft triangle   (x,y,z,w==1)
     0.00, -0.05, 0.00,    0.0, 0.0, 0.0,   0, 0, 1, 
     -0.05, 0.30, 0.00,    1.0, 1.0, 0.0,   0, 0, 1, 
     0.00, -0.05, 0.00, 	 0.0, 0.0, 0.0,   0, 0, 1,      // btmright triangle   (x,y,z,w==1)
     0.05, -0.05, 0.00,    1.0, 1.0, 0.0,   0, 0, 1, 
     0.05, 0.30, 0.00,     1.0, 1.0, 0.0,   0, 0, 1, 
     -0.05, 0.30, 0.00,	   1.0,  0.0, 0.0,  0, 0, 1,      // btmmiddle triangle   (x,y,z,w==1)
     0.00, -0.05, 0.00,    0.0,  0.0, 0.0,  0, 0, 1, 
     0.05, 0.30, 0.00,    1.0,  0.0,  0.0,  0, 0, 1, 
      //cuboid lid
     -0.05, 0.65, 0.00,	   1.0, 1.0, 1.0,   0, 1, 0, 
      0.00, 0.65, -0.05,	 1.0, 1.0, 0.0,   0, 1, 0, 
     -0.05, 0.65, -0.1,	   1.0, 1.0, 1.0,   0, 1, 0,
     
     -0.05, 0.65, 0.00,	   1.0, 1.0, 0.0,   0, 1, 0,
      0.05, 0.65, 0.00,   1.0, 1.0, 0.0,    0, 1, 0,
      0.00, 0.65, -0.05,	 1.0, 1.0, 1.0,   0, 1, 0,
      
      0.05, 0.65, 0.00,	   1.0, 1.0, 0.0,   0, 1, 0,
      0.05, 0.65, -0.1,	   1.0, 1.0, 0.0,   0, 1, 0,
      0.00, 0.65, -0.05,	 1.0, 1.0, 1.0,   0, 1, 0,
            
      -0.05, 0.65, -0.1,	1.0, 1.0, 0.0,    0, 1, 0,
      0.05, 0.65, -0.1,   1.0, 1.0, 0.0,    0, 1, 0,
      0.00, 0.65, -0.05,	1.0, 1.0, 1.0,    0, 1, 0,
     //cuboid base
     -0.05, -0.05, 0.00,	 1.0, 1.0, 1.0,   0,-1,0,
      0.00, -0.05, -0.05,	 1.0, 1.0, 0.0,   0,-1,0,
     -0.05, -0.05, -0.1,	 1.0, 1.0, 1.0,   0,-1,0,
     
     -0.05, -0.05, 0.00,	  1.0, 1.0, 0.0,   0,-1,0,
      0.05, -0.05, 0.00,	  1.0, 1.0, 0.0,   0,-1,0,
      0.00, -0.05, -0.05,	  1.0, 1.0, 1.0,   0,-1,0,
      
      0.05, -0.05, 0.00,	  1.0, 1.0, 0.0,   0,-1,0,
      0.05, -0.05, -0.1,	  1.0, 1.0, 0.0,   0,-1,0,
      0.00, -0.05, -0.05,   1.0, 1.0, 1.0,   0,-1,0,
            
      -0.05, -0.05, -0.1, 	 1.0, 1.0, 0.0,   0,-1,0,
      0.05, -0.05, -0.1,	   1.0, 1.0, 0.0,   0,-1,0,
      0.00, -0.05, -0.05, 	 1.0, 1.0, 1.0,   0,-1,0,
  ]);
	
	worldAxes = new Float32Array ([

	0, 0, 0,		1, 0, 0,      0,0,1,
    1, 0, 0,	  1.0, 0, 0,    0,0,1,
	0, 0, 0,   0, 1.0, 0,    0,0,1,
    0, 1, 0,   0, 1.0, 0,    0,0,1,
	0, 0, 0,   0, 0, 1,      0,0,1,
    0, 0, 1,   1.0, 0, 1,    0,0,1,
	]);
  
  makeGroundGrid();
  makeSphere();
	
	//==============================================================================
	var c30 = Math.sqrt(0.75);					// == cos(30deg) == sqrt(3) / 2
	var sq2	= Math.sqrt(2.0);						 
	// for surface normals:
	var sq23 = Math.sqrt(2.0/3.0);
	var sq29 = Math.sqrt(2.0/9.0);
	var sq89 = Math.sqrt(8.0/9.0);
	var thrd = 1.0/3.0;
	
	colorShapes = new Float32Array([
// Face 0: (right side).  Unit Normal Vector: N0 = (sq23, sq29, thrd)
     // Node 0 (apex, +z axis; 			color--blue, 				surf normal (all verts):
          0.0,	 0.0, sq2,			0.0, 	0.0,	1.0,		 sq23,	sq29, thrd,
     // Node 1 (base: lower rt; red)
     			c30, -0.5, 0.0, 			1.0,  0.0,  0.0, 		sq23,	sq29, thrd,
     // Node 2 (base: +y axis;  grn)
     			0.0,  1.0, 0.0,   		0.0,  1.0,  0.0,		sq23,	sq29, thrd, 
// Face 1: (left side).		Unit Normal Vector: N1 = (-sq23, sq29, thrd)
		 // Node 0 (apex, +z axis;  blue)
		 			0.0,	 0.0, sq2, 			0.0, 	0.0,	1.0,	 -sq23,	sq29, thrd,
     // Node 2 (base: +y axis;  grn)
     			0.0,  1.0, 0.0,   		0.0,  1.0,  0.0,	 -sq23,	sq29, thrd,
     // Node 3 (base:lower lft; white)
    			-c30, -0.5, 0.0,  		1.0,  1.0,  1.0, 	 -sq23,	sq29,	thrd,
// Face 2: (lower side) 	Unit Normal Vector: N2 = (0.0, -sq89, thrd)
		 // Node 0 (apex, +z axis;  blue) 
		 			0.0,	 0.0, sq2, 			0.0, 	0.0,	1.0,		0.0, -sq89,	thrd,
    // Node 3 (base:lower lft; white)
    			-c30, -0.5, 0.0,  		1.0,  1.0,  1.0, 		0.0, -sq89,	thrd,          																							//0.0, 0.0, 0.0, // Normals debug
     // Node 1 (base: lower rt; red) 
     			c30, -0.5, 0.0, 			1.0,  0.0,  0.0, 		0.0, -sq89,	thrd,
// Face 3: (base side)  Unit Normal Vector: N2 = (0.0, 0.0, -1.0)
    // Node 3 (base:lower lft; white)
    			-c30, -0.5, 0.0,  		1.0,  1.0,  1.0, 		0.0, 	0.0, -1.0,
    // Node 2 (base: +y axis;  grn)
     			0.0,  1.0, 0.0,   		0.0,  1.0,  0.0,		0.0, 	0.0, -1.0,
    // Node 1 (base: lower rt; red)
     			c30, -0.5, 0.0,  			1.0,  0.0,  0.0, 		0.0, 	0.0, -1.0,
// Face 0: (right side).  Unit Normal Vector: N0 = (sq23, sq29, thrd)
     // Node 0 (apex, +z axis; 			color--blue, 				surf normal (all verts):
          0.0,	 0.0, sq2,			0.0, 	0.0,	1.0,		 sq23,	sq29, thrd,
     // Node 1 (base: lower rt; white)
     			c30, -0.5, 0.0, 			1.0,  1.0,  1.0, 		sq23,	sq29, thrd,
     // Node 2 (base: +y axis;  grn)
     			0.0,  1.0, 0.0,   		0.0,  1.0,  0.0,		sq23,	sq29, thrd, 
// Face 1: (left side).		Unit Normal Vector: N1 = (-sq23, sq29, thrd)
		 // Node 0 (apex, +z axis;  blue)
		 			0.0,	 0.0, sq2, 			0.0, 	0.0,	1.0,	 -sq23,	sq29, thrd,
     // Node 2 (base: +y axis;  grn)
     			0.0,  1.0, 0.0,   		0.0,  1.0,  0.0,	 -sq23,	sq29, thrd,
     // Node 3 (base:lower lft; red)
    			-c30, -0.5, 0.0,  		1.0,  0.0,  0.0, 	 -sq23,	sq29,	thrd,
// Face 2: (lower side) 	Unit Normal Vector: N2 = (0.0, -sq89, thrd)
		 // Node 0 (apex, +z axis;  blue) 
		 			0.0,	 0.0, sq2, 			0.0, 	0.0,	1.0,		0.0, -sq89,	thrd,
    // Node 3 (base:lower lft; red)
    			-c30, -0.5, 0.0,  		1.0,  0.0,  0.0, 		0.0, -sq89,	thrd,          																							//0.0, 0.0, 0.0, // Normals debug
     // Node 1 (base: lower rt; white) 
     			c30, -0.5, 0.0, 			1.0,  1.0,  1.0, 		0.0, -sq89,	thrd,
// Face 3: (base side)  Unit Normal Vector: N2 = (0.0, 0.0, -1.0)
    // Node 3 (base:lower lft; red)
    			-c30, -0.5, 0.0,  		1.0,  0.0,  0.0, 		0.0, 	0.0, -1.0,
    // Node 2 (base: +y axis;  grn)
     			0.0,  1.0, 0.0,   		0.0,  1.0,  0.0,		0.0, 	0.0, -1.0,
    // Node 1 (base: lower rt; white)
     			c30, -0.5, 0.0,  			1.0,  1.0,  1.0, 		0.0, 	0.0, -1.0,
      ]);

	boxes = new Float32Array ([

	//front & back
		 0.7, -0.3, 0.3,	1, 0.5, 0,    0,0,1,
     0.7, 0.3, 0.3,	  1, 0.5, 0,    0,0,1,
		 -0.7, 0.3, 0.3,  1, 0.5, 0,    0,0,1,
		 
		 0.7, -0.3, 0.3,		1, 0.5, 0,    0,0,1,
     -0.7, -0.3, 0.3,	  1, 0.5, 0,    0,0,1,
		 -0.7, 0.3, 0.3,   	1, 0.5, 0,    0,0,1,
		 
		0.7, -0.3, -0.3,	1, 0.5, 0,    	0,0,-1,
    0.7, 0.3, -0.3,	  1, 0.5, 0,    	0,0,-1,
		-0.7, 0.3, -0.3,  1, 0.5, 0,    	0,0,-1,
		 
		0.7, -0.3, -0.3,		1, 0.5, 0,    0,0,-1,
    -0.7, -0.3, -0.3,	  1, 0.5, 0,    0,0,-1,
		-0.7, 0.3, -0.3,   	1, 0.5, 0,    0,0,-1,
		
		//top & bottom
		0.7, 0.3, -0.3,		1, 0.5, 0,    	0,1,0,
    0.7, 0.3, 0.3,	  1, 0.5, 0,    	0,1,0,
		-0.7, 0.3, -0.3,  1, 0.5, 0,    	0,1,0,
		 
		-0.7, 0.3, -0.3,		1, 0.5, 0,    0,1,0,
    -0.7, 0.3, 0.3,	  	1, 0.5, 0,   	0,1,0,
		0.7, 0.3, 0.3,   		1, 0.5, 0,    0,1,0,
				
		0.7, -0.3, -0.3,		1, 0.5, 0,    	0,-1,0,
    0.7, -0.3, 0.3,	  	1, 0.5, 0,    	0,-1,0,
		-0.7, -0.3, -0.3,  	1, 0.5, 0,    	0,-1,0,
		 
		-0.7, -0.3, -0.3,			1, 0.5, 0,    0,-1,0,
    -0.7, -0.3, 0.3,	  	1, 0.5, 0,   	0,-1,0,
		0.7, -0.3, 0.3,   		1, 0.5, 0,    0,-1,0,
		 
		 //left & right
		-0.7, -0.3, 0.3,	1, 0.5, 0,  -1,0,0,
    -0.7, 0.3, 0.3,	  1, 0.5, 0,  -1,0,0,
		-0.7, 0.3, -0.3,  1, 0.5, 0,  -1,0,0,
		
		-0.7, -0.3, 0.3,	1, 0.5, 0,  -1,0,0,
    -0.7, 0.3, -0.3, 	1, 0.5, 0,  -1,0,0,
		-0.7, -0.3, -0.3, 1, 0.5, 0,  -1,0,0,
		
		0.7, -0.3, 0.3,		1, 0.5, 0,    1,0,0,
    0.7, 0.3, 0.3,	  1, 0.5, 0,    1,0,0,
		0.7, 0.3, -0.3,   1, 0.5, 0,    1,0,0,
		
		0.7, -0.3, 0.3,		1, 0.5, 0,    1,0,0,
    0.7, 0.3, -0.3, 	1, 0.5, 0,    1,0,0,
		0.7, -0.3, -0.3,  1, 0.5, 0,    1,0,0,

		 ]);
  
  // How much space to store all the shapes in one array?
	// (no 'var' means this is a global variable)
	mySiz = jointedObjectVertices.length + gndVerts.length + worldAxes.length + colorShapes.length + boxes.length + sphereVec.length;
  var nn = mySiz / floatsPerVertex;
  
  // Copy all shapes into one big Float32 array:
  var verticesColors = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:
	worldStart = 0;
	for(i=worldStart,j=0; j < worldAxes.length; i++,j++) {
		verticesColors[i] = worldAxes[j];
	}
	vertStart = i;							// we store the forest first.
  for(j=0; j< jointedObjectVertices.length; i++,j++) {
  	verticesColors[i] = jointedObjectVertices[j];
		}
	tetraStart = i;							// we store the forest first.
  for(j=0; j< colorShapes.length; i++,j++) {
  	verticesColors[i] = colorShapes[j];
		} 
	gndStart = i;						// next we'll store the ground-plane;
	for(j=0; j< gndVerts.length; i++, j++) {
		verticesColors[i] = gndVerts[j];
		}
	boxStart = i;						// next we'll store the ground-plane;
	for(j=0; j< boxes.length; i++, j++) {
		verticesColors[i] = boxes[j];
		}
	sphereStart = i;						// next we'll store the ground-plane;
	for(j=0; j< sphereVec.length; i++, j++) {
		verticesColors[i] = sphereVec[j];
		}
    
  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  // Assign the buffer object to a_Position variable
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  var FSIZE = verticesColors.BYTES_PER_ELEMENT; // how many bytes per stored value?
  
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 9, 0);
  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);
	// Get graphics system's handle for our Vertex Shader's normal-vec-input variable;
  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if(a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return -1;
  }
	// Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
  	a_Normal, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using x,y,z)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 9, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b, nx,ny,nz) * bytes/value
  	FSIZE * 6);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w,r,g,b
  									
  gl.enableVertexAttribArray(a_Normal);  

  return nn;
}


function drawCuboid(gl, start, end, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix) {
	
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	// Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw the rectangle held in the VBO we created in initVertexBuffers()
	gl.drawArrays(gl.TRIANGLES, start, end);
	modelMatrix.rotate(90, 0, 1, 0);
	modelMatrix.translate(0.05, 0, 0.05);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, start, end);
	modelMatrix.rotate(90, 0, 1, 0);
	modelMatrix.translate(0.05, 0, 0.05);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, start, end);
	modelMatrix.rotate(90, 0, 1, 0);
	modelMatrix.translate(0.05, 0, 0.05);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, start, end);
}

function drawRectangle(gl, objectStart, groundStart, currentAngle, zAngle, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix) {

	modelMatrix.rotate(-90.0, 1,0,0);	
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	
	pushMatrix(modelMatrix);
	drawAxes(gl, u_ModelMatrix, modelMatrix, normalMatrix, u_NormalMatrix);
	
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.LINES,gndStart/floatsPerVertex, gndVerts.length/floatsPerVertex);		// draw this many vertices
  
	//-------Draw Upper Static Line---------------
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.rotate(currentAngle, 0, 0, 1);
	modelMatrix.translate(0, 0.05, 0.1);
	pushMatrix(modelMatrix);
	// Draw the rectangle held in the VBO we created in initVertexBuffers().
	drawCuboid(gl, objectStart/floatsPerVertex, jointedObjectVertices.length/floatsPerVertex, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
	modelMatrix = popMatrix();
	//--------Draw Center Horizontal line
	modelMatrix.translate(0, 0.65, 0.1);
	modelMatrix.rotate(180 + currentAngle, 0, 0, 1);
	pushMatrix(modelMatrix);
	drawAxes(gl, u_ModelMatrix, modelMatrix, normalMatrix, u_NormalMatrix);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	drawCuboid(gl, objectStart/floatsPerVertex, jointedObjectVertices.length/floatsPerVertex, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
	//--------Draw right edge top square
	modelMatrix = popMatrix();
	modelMatrix.translate(0, 0.65, 0.1);
	modelMatrix.rotate(180 + currentAngle, 0, 0, 1);
	pushMatrix(modelMatrix);
	drawCuboid(gl, objectStart/floatsPerVertex, jointedObjectVertices.length/floatsPerVertex, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
	//--------Draw Upper edge top square
	modelMatrix = popMatrix();
	modelMatrix.translate(0, 0.65, 0.1);
	modelMatrix.rotate(180 + currentAngle, 0, 0, 1);
	drawCuboid(gl, objectStart/floatsPerVertex, jointedObjectVertices.length/floatsPerVertex, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
  
	//--------Draw Lower Static Line---------------
	modelMatrix = popMatrix();
	modelMatrix.rotate(180, 0, 0, 1);
	modelMatrix.scale( 1, 1, -1);
	modelMatrix.rotate(currentAngle, 0, 0, 1);
	modelMatrix.translate(0, 0.05, 0.1);
	pushMatrix(modelMatrix);
	drawCuboid(gl, objectStart/floatsPerVertex, jointedObjectVertices.length/floatsPerVertex, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
	modelMatrix = popMatrix();
	//--------Draw Center Horizontal line
	modelMatrix.translate(0, 0.65, 0.1);
	modelMatrix.rotate(180 + currentAngle, 0, 0, 1);
	pushMatrix(modelMatrix);
	drawCuboid(gl, objectStart/floatsPerVertex, jointedObjectVertices.length/floatsPerVertex, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
	modelMatrix = popMatrix();
	//--------Draw right edge btm square
	modelMatrix.translate(0, 0.65, 0.1);
	modelMatrix.rotate(180 + currentAngle, 0, 0, 1);
	pushMatrix(modelMatrix);
	drawCuboid(gl, objectStart/floatsPerVertex, jointedObjectVertices.length/floatsPerVertex, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
	modelMatrix = popMatrix();
	//--------Draw Upper edge btm square
	modelMatrix.translate(0, 0.65 , 0.1);
	modelMatrix.rotate(180 + currentAngle, 0, 0, 1);
	drawCuboid(gl, objectStart/floatsPerVertex, jointedObjectVertices.length/floatsPerVertex, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function limitAngle (min, max, angle, step) {
  
  if(angle >  max && step > 0) step = -step;
  if(angle <  min && step < 0) step = -step;
  return step;
}

function animate(angle, angleName, elapsed) {
//==============================================================================
  var newAngle;
  
  if (angleName === anglesEnum.REC_STICK_ANGLE) {
    
     ANGLE_STEP = limitAngle(-90, 90, angle, ANGLE_STEP);
     newAngle = angle + (ANGLE_STEP * elapsed * SPEED) / 1000.0;
  }
  if (angleName === anglesEnum.Z_ANGLE) {
    ANGLE_STEP_3D = limitAngle (-45, 45, angle, ANGLE_STEP_3D);
    if (SPEED === 0) {
      newAngle = angle + ANGLE_STEP_3D*elapsed/1000.0;
    } else {
      newAngle = angle;
    }
  }
  
  return newAngle %= 360;
}

function drawAxes(gl, u_ModelMatrix, modelMatrix, normalMatrix, u_NormalMatrix) {
	modelMatrix.scale(0.4, 0.4,0.4);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_NormalMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.LINES, worldStart/floatsPerVertex, worldAxes.length/floatsPerVertex);		// draw this many vertices
}
//===================Mouse and Keyboard event-handling Callbacks
function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;
// 									(Which button?    console.log('ev.button='+ev.button);   )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var x = ev.clientX - rect.left;									// x==0 at canvas left edge
  var y = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge

  // Convert to Canonical View Volume (CVV) coordinates too:
	var yp = (y - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	var xp = (x - canvas.width/2) / (canvas.width/2);
  
	if (xp > 1) {isInViewPort = false;}
	else {isInViewPort = true;}
	isDrag = true;											// set our mouse-dragging flag
	yMclik = yp;
	xMclick = xp;
}

function myMouseMove(ev, gl, canvas) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

	if(isDrag===false || isInViewPort ===false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var x = ev.clientX - rect.left;	
	var y = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
// Convert to Canonical View Volume (CVV) coordinates too:
	var yp = (y - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	var xp = (x - canvas.width/2) / (canvas.width/2);

	// find how far we dragged the mouse:
  lookat_Y += (yp - yMclik);
	yMclik = yp;
	//xMdragTot += (xp - xMclick);
	lookLR((xp - xMclick));
	xMclick = xp;
}

function myMouseUp(ev, gl, canvas) {

	isDrag = false;
}

function myKeyDown(ev) {
//===============================================================================

	switch(ev.keyCode) {			// keycodes !=ASCII, but are very consistent for 
	//	nearly all non-alphanumeric keys for nearly all keyboards in all countries.
		case 87:		// w key
			moveCamFB(directionEnum.Forward);
      break;
		case 65:		// a key
      moveCamLR(directionEnum.Left);
      break;
		case 83: //s key
		  moveCamFB(directionEnum.Backward);
			break;
		case 68: //d key
			moveCamLR(directionEnum.Right);
			break;
		default:
			console.log('myKeyDown()--keycode=', ev.keyCode, ', charCode=', ev.charCode);
  		//document.getElementById('Result').innerHTML =
  		//	'myKeyDown()--keyCode='+ev.keyCode;
			break;
	}
}

function myKeyUp(ev) {
	console.log(g_EyeX, g_EyeY, g_EyeZ);
	console.log(lamp0.I_pos.elements.slice(0,3));
}

function displayError(msg) {
  
  document.getElementById('error-msg').innerHTML = msg;
  document.getElementById('error').className = "";
}

function closeError() {
  
  document.getElementById('error').className = "hidden";
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;		
	var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
 	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
 	
	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
		}
		gndVerts[j+3] = xColr[0];			// red
		gndVerts[j+4] = xColr[1];			// grn
		gndVerts[j+5] = xColr[2];			// blu
		gndVerts[j+6] = 0;
		gndVerts[j+7] = 0;
		gndVerts[j+8] = 1;
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
		}
		gndVerts[j+3] = yColr[0];			// red
		gndVerts[j+4] = yColr[1];			// grn
		gndVerts[j+5] = yColr[2];			// blu
		gndVerts[j+6] = 0;
		gndVerts[j+7] = 0;
		gndVerts[j+8] = 1;
	}
}

function makeSphere() {

	var SPHERE_DIV = 13; //default: 13.  JT: try others: 11,9,7,5,4,3,2,
	var sliceVerts = 27;
	var sliceAngle = Math.PI/SPHERE_DIV;
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;	
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;

	sphereVec = new Float32Array( ((SPHERE_DIV * 2* sliceVerts) -2) * floatsPerVertex);
	// Generate coordinates
	for(s=0; s<SPHERE_DIV; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s===0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;	
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
		if(s==SPHERE_DIV-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
			if(v%2===0)
			{				// put even# vertices at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI(v/2*sliceVerts))  
				sphereVec[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
				sphereVec[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
				sphereVec[j+2] = cos0;		
			}
			else { 	// put odd# vertices around the slice's lower edge;

				sphereVec[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				sphereVec[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				sphereVec[j+2] = cos1;																				// z		
			}
			sphereVec[j+3]= 1; //r
			sphereVec[j+4]= 0.5; //g
			sphereVec[j+5]= 0.5; //b
			
			sphereVec[j+6]= sphereVec[j ]; //normal 
			sphereVec[j+7]= sphereVec[j+1]; //norm
			sphereVec[j+8]= sphereVec[j+2]; //norm
		}
	}
}

function draw(gl, u_ViewMatrix, viewMatrix, currentAngle, zAngle, tetraAngle, normalMatrix, u_NormalMatrix, projMatrix, u_ProjMatrix, modelMatrix, u_ModelMatrix) {
//==============================================================================
	var nuCanvas = document.getElementById('webgl');	// get current canvas
	gl = getWebGLContext(nuCanvas);							// and context
	nuCanvas.width = innerWidth;
	nuCanvas.height = innerHeight*3/4;
	
	// Clear <canvas> color AND DEPTH buffer
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.viewport(0,0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  				
	vpAspect = gl.drawingBufferWidth /gl.drawingBufferHeight;
			  
	projMatrix.setPerspective(30, vpAspect, 1, 100);	// near, far (always >0).
	viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, lookat_X, lookat_Y, lookat_Z, 0, 1, 0);
	gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);// View UP vector, all in 'world' coords.
	// Pass the view projection matrix
	gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

	modelMatrix.setIdentity();
	drawRectangle(gl, vertStart, gndStart, currentAngle, zAngle, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);   // Draw the rectangle

	gl.uniform3fv(uLoc_Ke, matl1.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(uLoc_Ka, matl1.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(uLoc_Kd, matl1.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(uLoc_Ks, matl1.K_spec.slice(0,3));				// Ks specular
	gl.uniform1i(uLoc_Kshiny, parseInt(matl1.K_shiny, 10));     // Kshiny
	  
	modelMatrix.setIdentity();
	modelMatrix.rotate(-90.0, 1,0,0);
	modelMatrix.rotate(tetraAngle, 0, 0, 1);	
	pushMatrix(modelMatrix);
	modelMatrix.translate(2, 0, 0);
	drawTetra (gl, (tetraAngle+180)%360, modelMatrix,  u_ModelMatrix, normalMatrix, u_NormalMatrix);
	
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(-2, 0, 0);
	drawTetra (gl, (tetraAngle+180)%360, modelMatrix,  u_ModelMatrix, normalMatrix, u_NormalMatrix);
		
	gl.uniform3fv(uLoc_Ke, matl2.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(uLoc_Ka, matl2.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(uLoc_Kd, matl2.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(uLoc_Ks, matl2.K_spec.slice(0,3));				// Ks specular
	gl.uniform1i(uLoc_Kshiny, parseInt(matl2.K_shiny, 10));     // Kshiny
	
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, 2, 0);
	drawTetra (gl, (tetraAngle)%500 , modelMatrix,  u_ModelMatrix, normalMatrix, u_NormalMatrix);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(0, -2, 0);
	drawTetra (gl, (tetraAngle)%500, modelMatrix,  u_ModelMatrix, normalMatrix, u_NormalMatrix);
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);

	
	modelMatrix.rotate(-tetraAngle, 0, 0, 1);
	modelMatrix.translate(1, 0, 2);
	modelMatrix.scale(0.5,0.5,0.5);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, sphereStart/floatsPerVertex, sphereVec.length/floatsPerVertex);
	modelMatrix = popMatrix();
	
	gl.uniform3fv(uLoc_Ke, matl3.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(uLoc_Ka, matl3.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(uLoc_Kd, matl3.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(uLoc_Ks, matl3.K_spec.slice(0,3));				// Ks specular
	gl.uniform1i(uLoc_Kshiny, parseInt(matl3.K_shiny, 10));     // Kshiny
		
	modelMatrix.translate (0,0,1);
	drawTetra2 (gl, (tetraAngle)%500, modelMatrix,  u_ModelMatrix, normalMatrix, u_NormalMatrix);
}
	
function lookLR(dir) {
	rad += dir * 100;
	rad = rad%360;
	lookat_X = g_EyeX + Math.sin(Math.PI * rad / 180);
	lookat_Z = g_EyeZ - Math.cos(Math.PI * rad / 180);
}

function moveCamLR(dir) {
	vectorEL_X = lookat_X - g_EyeX;
	vectorEL_Y = lookat_Y - g_EyeY;
	vectorEL_Z = lookat_Z - g_EyeZ;
	crossVector_X =  -vectorEL_Z;
	crossVector_Y = 0;
	crossVector_Z = vectorEL_X;
	normalize = Math.sqrt(crossVector_X*crossVector_X+crossVector_Y*crossVector_Y+crossVector_Z*crossVector_Z) * dir;
	crossVector_X_norm = crossVector_X / normalize;
	crossVector_Y_norm = crossVector_Y / normalize;
	crossVector_Z_norm = crossVector_Z / normalize;
	lookat_X += crossVector_X_norm / 30;
	g_EyeX += crossVector_X_norm / 30;
	lookat_Y += crossVector_Y_norm / 30;
	g_EyeY += crossVector_Y_norm / 30;
	lookat_Z += crossVector_Z_norm / 30;
	g_EyeZ += crossVector_Z_norm / 30;
}

function moveCamFB(dir) {
	vectorEL_X = lookat_X - g_EyeX;
	vectorEL_Y = lookat_Y - g_EyeY;
	vectorEL_Z = lookat_Z - g_EyeZ;
	normalize = Math.sqrt(vectorEL_X*vectorEL_X+vectorEL_Y*vectorEL_Y+vectorEL_Z*vectorEL_Z) * dir;
	vector_X_norm = vectorEL_X / normalize;
	vector_Y_norm = vectorEL_Y / normalize;
	vector_Z_norm = vectorEL_Z / normalize;
	lookat_X += vector_X_norm / 10;
	g_EyeX += vector_X_norm / 10;
	lookat_Y += vector_Y_norm / 10;
	g_EyeY += vector_Y_norm / 10;
	lookat_Z += vector_Z_norm / 10;
	g_EyeZ += vector_Z_norm / 10;
}

function drawTetra (gl, currentAngle, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix) {
	
	modelMatrix.scale(0.3, 0.3, 0.3);
  						// if you DON'T scale, tetra goes outside the CVV; clipped!
	modelMatrix.rotate(currentAngle, 0, 0, 1);  // spin drawing axes on Y axis;
	modelMatrix.translate(0,0,((currentAngle-180) * (currentAngle-180) / 30000 * 2));
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, tetraStart/floatsPerVertex, colorShapes.length/2/floatsPerVertex);
	
	pushMatrix(modelMatrix);
	modelMatrix.translate(0,0,Math.sqrt(2.0));
	modelMatrix.rotate(-(currentAngle * 4) , 0, 0, 1);
	modelMatrix.scale (2,0.5,0.5);
	modelMatrix.translate(0,0,0.3);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, boxStart/floatsPerVertex, boxes.length/floatsPerVertex);
	
	modelMatrix = popMatrix();
	modelMatrix.rotate(180, 0, 1, 0);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, tetraStart/floatsPerVertex + colorShapes.length/2/floatsPerVertex, colorShapes.length/2/floatsPerVertex);
}

function drawTetra2 (gl, currentAngle, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix) {
	
	modelMatrix.scale(0.3, 0.3, 0.3);
	modelMatrix.rotate(currentAngle, 0, 0, 1);  // spin drawing axes on Y axis;
	modelMatrix.translate(0,0,((currentAngle-180) * (currentAngle-180) / 30000 * 2));
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, tetraStart/floatsPerVertex, colorShapes.length/2/floatsPerVertex);
	
	pushMatrix(modelMatrix);
	modelMatrix.translate(0,0,Math.sqrt(2.0));
	modelMatrix.rotate(-(currentAngle * 4) , 0, 0, 1);
	modelMatrix.scale (2,0.5,0.5);
	modelMatrix.translate(0,0,0.3);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, boxStart/floatsPerVertex, boxes.length/floatsPerVertex);
	
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(0,0,-Math.sqrt(2.0));
	modelMatrix.rotate(-(currentAngle * 4) , 0, 0, 1);
	modelMatrix.scale (2,0.5,0.5);
	modelMatrix.translate(0,0,-0.3);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, boxStart/floatsPerVertex, boxes.length/floatsPerVertex);
	
	modelMatrix = popMatrix();
	modelMatrix.rotate(180, 0, 1, 0);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, tetraStart/floatsPerVertex + colorShapes.length/2/floatsPerVertex, colorShapes.length/2/floatsPerVertex);
}

function updateMode(mode) {
	
	if (mode != 1 && mode != 2 && mode != 3 && mode !=4) {
		return;
	}
	var curr_mode;
	modeSelected = mode;
	switch (modeSelected) {
		case modeEnum.GP: 
		curr_mode = 'Gouraud Shading with Phong lighting';
		break;
		case modeEnum.GB:
		curr_mode = 'Gouraud Shading with Blin-Phong lighting';
		break;
		case modeEnum.PP:
		curr_mode = 'Phong Shading with Phong lighting';
		break;
		case modeEnum.PB:
		curr_mode = 'Phong Shading with Blin-Phong lighting';
		break;
		default:break;
	}
	document.getElementById('curr_mode').innerHTML = 'Current Mode: ' + curr_mode;
}

function toggleLight(light) {
	
	if (light === 0) {
		if (lamp0On) {
			lamp0On = false;
		} else {
			lamp0On = true;
		}
	} else if ( light === 1) {
		if (lamp1On) {
			lamp1On = false;
		} else {
			lamp1On = true;
		}
	}
}

function moveLight(dir){
	
	if (dir === dirEnum.Down) { lamp1pos[1] -= 0.5; }
	if (dir === dirEnum.Up) { lamp1pos[1] += 0.5; }
	if (dir === dirEnum.Left) { lamp1pos[0] -= 0.5; }
	if (dir === dirEnum.Right) { lamp1pos[0] += 0.5; }
	if (dir === dirEnum.Forward) { lamp1pos[2] -= 0.5; }
	if (dir === dirEnum.Backward) { lamp1pos[2] += 0.5; }
	
}