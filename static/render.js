function Render(vue) {
    this.init = function(canvas, player, width, height) {

      var renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: true, alpha: true
      });
      renderer.setSize(width, height);

      var scene = new THREE.Scene();

      var camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 10000);
      camera.position.set(150, 200, 200);
      camera.updateProjectionMatrix();
      scene.add(camera);
      player.render.camera = camera;

      var pointLight = new THREE.PointLight(player.color.hex());
      pointLight.position.set(0, 300, 200);
      scene.add(pointLight);

      // Create a couple groups to apply rotations to the 3D model at different
      // stages.  The outer group called offset is set to the reverse rotation
      // of the current BNO orientation when the 'Straighten' button is clicked.
      // This will force the model to center itself staring directly out of
      // the screen.  The inner group called orientation will be rotated with
      // the current BNO sensor orientation and cause the model to rotate.
      // Cribbed from https://github.com/adafruit/Adafruit_Python_BNO055/blob/master/examples/webgl_demo/templates/index.html
      var offset = new THREE.Group();
      var orientation = new THREE.Group();
      offset.add(orientation);
      scene.add(offset);
      player.render.offset = offset;
      player.render.orientation = orientation;

      var target = null;
      var render = function() {
          requestAnimationFrame(render);
          orientation.quaternion.copy(new THREE.Quaternion(player.orient.x, player.orient.y, player.orient.z, player.orient.w));
          offset.quaternion.copy(new THREE.Quaternion(player.adjust.x, player.adjust.y, player.adjust.z, player.adjust.w));
          renderer.render(scene, camera);
      }.bind(this);

      var manager = new THREE.LoadingManager();
      var loader = new THREE.OBJLoader(manager);
      loader.load('human.obj', function (o) {
          target = o;
          orientation.add(o);
          o.children[0].geometry.computeBoundingBox();
          var bbox = o.children[0].geometry.boundingBox;
          camera.lookAt(bbox.center());

          // var box = new THREE.BoxHelper( o, 0xff00 );
          // scene.add(box);
          render();
      }, function (xhr) {
          console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      }, function ( error ) {
          console.log( 'An error happened' );
      });
  }.bind(vue);
}
