function Render(vue) {
    var camera = null;
    this.init = function(canvas, player, width, height) {
    console.log(canvas)
      var renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: true, alpha: true
      });
      renderer.setSize(width, height);

      var scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 10000);
      camera.position.set(150, 200, 200);
      camera.zoom = player.zoom;
      camera.updateProjectionMatrix();
      scene.add(camera);

      var pointLight = new THREE.PointLight(0xffffff);
      pointLight.position.set(0, 300, 200);
      scene.add(pointLight);

      var clock = new THREE.Clock();
      var target = null;
      var render = function() {
          requestAnimationFrame(render);
          target.rotation.x = player.orient.x;
          target.rotation.y = player.orient.y;
          target.rotation.z = player.orient.z;
          renderer.render(scene, camera);
      }.bind(this);

      var manager = new THREE.LoadingManager();
      var loader = new THREE.OBJLoader(manager);
      loader.load('human.obj', function (o) {
          target = o;
          scene.add(o);
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

  this.adjustZoom = function(player) {
      console.log(player.zoom)
    if (player.zoom < 0) camera.zoom = 1 / (player.zoom * -1);
    else camera.zoom = player.zoom;
    camera.updateProjectionMatrix();
  }.bind(vue);
}
