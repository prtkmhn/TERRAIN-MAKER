//Source: http://www.chandlerprall.com/webgl/terrain/
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// shim layer with setTimeout fallback
window['requestAnimFrame'] = (function () {
  return window.requestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          window.oRequestAnimationFrame ||
          window.msRequestAnimationFrame ||
          function (/* function */ callback, /* DOMElement */ element) {
            window.setTimeout(callback, 1000 / 60);
          };
})();

function Degrees2Radians(degrees) {
  return degrees * (Math.PI / 180)
};

window.onload = function () {

  /** CONFIG **/
  var plots_x = 40;
  var plots_y = 40;
  var plot_vertices = 2;

  var map_left = plots_x / -2;
  var map_top = plots_y / -2;

  var rotation = 0;


  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(800, 640);
  document.getElementById('viewport').appendChild(renderer.domElement);

  var projector = new THREE.Projector();

  var scene = new THREE.Scene();

  var camera = new THREE.Camera(
    35,
    800 / 640,
    .1,
    10000
  );
  camera.position.set(40, 30, 40);
  window.camera = camera;

  // Create the land
  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(plots_x, plots_y, plots_x * plot_vertices, plots_y * plot_vertices),
    new THREE.MeshShaderMaterial({
      uniforms: {
        texture_grass: { type: "t", value: 0, texture: THREE.ImageUtils.loadTexture('textures/texture_ground_grass.jpg') },
        texture_bare: { type: "t", value: 1, texture: THREE.ImageUtils.loadTexture('textures/texture_ground_bare.jpg') },
        texture_snow: { type: "t", value: 2, texture: THREE.ImageUtils.loadTexture('textures/texture_ground_snow.jpg') },
        show_ring: { type: 'i', value: true },
        ring_width: { type: 'f', value: 0.15 },
        ring_color: { type: 'v4', value: new THREE.Vector4(1.0, 0.0, 0.0, 1.0) },
        ring_center: { type: 'v3', value: new THREE.Vector3() },
        ring_radius: { type: 'f', value: 5.0 }
      },
      attributes: {
        displacement: { type: 'f', value: [] }
      },
      vertexShader: document.getElementById('groundVertexShader').textContent,
      fragmentShader: document.getElementById('groundFragmentShader').textContent
    })
  );
  ground.dynamic = true;
  ground.displacement = ground.materials[0].attributes.displacement;
  for (var i = 0; i < ground.geometry.vertices.length; i++) {
    ground.materials[0].attributes.displacement.value.push(0);
  }
  ground.rotation.x = Degrees2Radians(-90);
  scene.addChild(ground);

  // Water
  ground.water = new THREE.Mesh(
    new THREE.PlaneGeometry(plots_x, plots_y, plots_x * plot_vertices, plots_y *plot_vertices),
    new THREE.MeshShaderMaterial({
      uniforms: {
        water_level: { type: 'f', value: -2 },
        time: { type: 'f', value: 0 }
      },
      attributes: {
        displacement: { type: 'f', value: [] }
      },
      vertexShader: document.getElementById('waterVertexShader').textContent,
      fragmentShader: document.getElementById('waterFragmentShader').textContent,
      transparent: true
    })
  );
  ground.water.dynamic = true;
  ground.water.displacement = ground.water.materials[0].attributes.displacement;
  for (var i = 0; i < ground.water.geometry.vertices.length; i++) {
    ground.water.materials[0].attributes.displacement.value.push(0);
  }
  ground.water.position.z = -2;
  ground.addChild(ground.water);


  /** VERTEX POINTS **/
  var verticeIndex = function (vertice) {
    return vertice.x + vertice.y * ((plots_x * plot_vertices) + 1);
  };

  var findLattices = (function () {
    function distance(x, y) {
      return Math.pow(x, 2) + Math.pow(y, 2);
    }

    function generate_n2(radius) {

      var ymax = [0];
      var d = 0;

      var points = [];

      var batch, x, y;

      while (d <= radius) {
        yieldable = []

        while (true) {
          batch = [];
          for (x = 0; x < d + 1; x++) {
            y = ymax[x];
            if (distance(x, y) <= Math.pow(d, 2)) {
              batch.push({ x: x, y: y });
              ymax[x] += 1;
            }
          }
          if (batch.length === 0) {
            break;
          }
          points = points.concat(batch);
        }

        d += 1
        ymax.push(0);
      }

      return points;

    };

    return function findLattices(radius, origin) {
      var all_points = [];

      var i, point, points = generate_n2(radius);
      for (i = 0; i < points.length; i++) {
        point = points[i];

        all_points.push(point);
        if (point.x !== 0) {
          all_points.push({ x: -point.x, y: point.y });
        }
        if (point.y !== 0) {
          all_points.push({ x: point.x, y: -point.y });
        }
        if (point.x && point.y) {
          all_points.push({ x: -point.x, y: -point.y });
        }
      }

      for (i = 0; i < all_points.length; i++) {
        all_points[i].x += origin.x;
        all_points[i].y += origin.y;
      };

      return all_points;
    }

  })()



  /** LANDSCAPING **/
  var landscape = new function () {
    var landscape_tool = null;
    var circleRadius = 5;
    var textureImage;

    this.setWaterLevel = function (level) {
      //ground.water.materials[0].uniforms.water_level = level;
      ground.water.position.z = level;
    }
    this.setRotation = function (rot) {
      rotation = rot;
      ground.rotation.z = Degrees2Radians(rotation);
    }

    this.changeTexture = {
      lower: function (item) {
        ground.materials[0].uniforms.texture_grass.texture = THREE.ImageUtils.loadTexture(item);
      },
      middle: function (item) {
        ground.materials[0].uniforms.texture_bare.texture = THREE.ImageUtils.loadTexture(item);
      },
      upper: function (item) {
        ground.materials[0].uniforms.texture_snow.texture = THREE.ImageUtils.loadTexture(item);
      }
    }
    this.setCircleRadius = function (cirRadius) {
      circleRadius = cirRadius;
      ground.materials[0].uniforms.ring_radius.value = cirRadius;
    }

    this.select = function (tool) {
      landscape_tool = tool;
    };

    this.onmousemove = function () {

      if (mouse_info.state === 2) { // The user has clicked and drug their mouse

        // Get all of the vertices in a 5-unit radius
        var vertices = findLattices(circleRadius * plot_vertices, mouse_info.vertex_coordinates);

        // Call the landscaping tool to do its job
        this.tools[landscape_tool](circleRadius * plot_vertices, vertices);

        // Ensure all of the vertices are within the elevation bounds
        var vertice_index;
        for (var i = 0; i < vertices.length; i++) {
          vertice_index = verticeIndex(vertices[i]);
          if (ground.displacement.value[vertice_index] > 14) {
            ground.displacement.value[vertice_index] = 14;
          }

          if (ground.displacement.value[vertice_index] < -8) {
            ground.displacement.value[vertice_index] = -8;
          }

          ground.water.displacement.value[vertice_index] = ground.displacement.value[vertice_index];
        }
        ground.water.displacement.needsUpdate = true;

      }

    };

    this.tools = {
      hill: function (radius, vertices) {

        var i, vertice, vertice_index, distance;

        for (i = 0; i < vertices.length; i++) {

          vertice = vertices[i];

          if (vertice.x < 0 || vertice.y < 0) {
            continue;
          }
          if (vertice.x >= plots_x * plot_vertices + 1 || vertice.y >= plots_y * plot_vertices + 1) {
            continue;
          }

          vertice_index = verticeIndex(vertice);
          distance = Math.sqrt(Math.pow(mouse_info.vertex_coordinates.x - vertice.x, 2) + Math.pow(mouse_info.vertex_coordinates.y - vertice.y, 2));

          ground.displacement.value[vertice_index] += Math.pow(radius - distance, .5) * .03;
          ground.displacement.needsUpdate = true;
        }

      },

      valley: function (radius, vertices) {

        var i, vertice, vertice_index, distance;

        for (i = 0; i < vertices.length; i++) {

          vertice = vertices[i];

          if (vertice.x < 0 || vertice.y < 0) {
            continue;
          }
          if (vertice.x >= plots_x * plot_vertices + 1 || vertice.y >= plots_y * plot_vertices + 1) {
            continue;
          }

          vertice_index = verticeIndex(vertice);
          distance = Math.sqrt(Math.pow(mouse_info.vertex_coordinates.x - vertice.x, 2) + Math.pow(mouse_info.vertex_coordinates.y - vertice.y, 2));

          ground.displacement.value[vertice_index] -= Math.pow(radius - distance, .5) * .03;
          ground.displacement.needsUpdate = true;

        }

      }
    };

  }
  window.landscape = landscape;
  landscape.select('hill');


  /** MOUSE **/
  var mouse_info = {
    x: 0,
    y: 0,
    button: 0,
    state: 0, // 0 - up, 1 - down, 2 - dragging,
    point: null,
    plot_coordinates: { x: null, y: null },
    vertex_coordinates: { x: null, y: null }
  };

  var updateMouse = function updateMouse(e) {
    e.preventDefault();
    e.cancelBubble = true;

    mouse_info.x = e.layerX;
    mouse_info.y = e.layerY;
    mouse_info.button = e.button;
  };

  var updateMouseCoordinates = function () {
    var vector = new THREE.Vector3((mouse_info.x / 800) * 2 - 1, -(mouse_info.y / 640) * 2 + 1, 0.5);
    projector.unprojectVector(vector, camera);

    var ray = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());

    var intersection = ray.intersectObject(ground);
    if (intersection.length === 0) {
      mouse_info.plot_coordinates.x = null;
      mouse_info.plot_coordinates.y = null;

      mouse_info.vertex_coordinates.x = null;
      mouse_info.vertex_coordinates.y = null;

      return null;
    } else {
      mouse_info.point = intersection[0].point;


      var x
      var z

      x = (Math.cos(Degrees2Radians(rotation)) * mouse_info.point.x -
                           Math.sin(Degrees2Radians(rotation)) * mouse_info.point.z)

      z = (Math.cos(Degrees2Radians(rotation)) * mouse_info.point.z +
                           Math.sin(Degrees2Radians(rotation)) * mouse_info.point.x)

      mouse_info.point.x = x
      mouse_info.point.z = z


      mouse_info.plot_coordinates.x = Math.floor(mouse_info.point.x - map_left);
      mouse_info.plot_coordinates.y = Math.floor(mouse_info.point.z - map_top);

      mouse_info.vertex_coordinates.x = Math.floor((mouse_info.point.x * plot_vertices) - (map_left * plot_vertices));
      mouse_info.vertex_coordinates.y = Math.floor((mouse_info.point.z * plot_vertices) - (map_top * plot_vertices));
    }

    ground.materials[0].uniforms.ring_center.value.x = mouse_info.point.x;
    ground.materials[0].uniforms.ring_center.value.y = -mouse_info.point.z;
  };

  renderer.domElement.onmousedown = function onmousedown(e) {
    mouse_info.state = 1;
    updateMouse(e);
  };
  renderer.domElement.onmouseup = function onmouseup(e) {
    mouse_info.state = 0;
    updateMouse(e);
  };
  renderer.domElement.onmousemove = function onmousemove(e) {
    if (mouse_info.state == 1) {
      mouse_info.state = 2;
    }
    updateMouse(e);
    updateMouseCoordinates();
    landscape.onmousemove();
  };
  renderer.domElement.onkeypress = function (e) {
    if (e.keyCode === 0 || e.keyCode === 30) {
      e.preventDefault();

    }
  }
  renderer.domElement.onmouseout = function onmouseout(e) {
    mouse_info.state = 0;
    updateMouse(e);
  };


  var render = function render() {
    renderer.render(scene, camera);
  };

  var main = function main() {

    ground.water.materials[0].uniforms.time.value = new Date().getTime() % 10000;

    render();
    window.requestAnimFrame(main);

  };

  requestAnimFrame(main);
}
