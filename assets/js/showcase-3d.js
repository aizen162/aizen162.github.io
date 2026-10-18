/* Aizen Store — 3D spinning product showcase (homepage hero).
   Three.js r128 (vendored in assets/js/three.min.js). No CDN needed. */
(function () {
  var mount = document.getElementById('showcase3d');
  if (!mount || typeof THREE === 'undefined') { fallbackStrip(); return; }

  var PICKS = ['p05', 'p06', 'p07', 'p08', 'p17', 'p21', 'p23', 'p24'];
  var labelEl = document.getElementById('showcase3d-label');

  fetch('assets/products.json').then(function (r) { return r.json(); })
    .then(function (products) {
      var items = PICKS.map(function (id) {
        for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i];
        return null;
      }).filter(Boolean);
      if (!items.length) { fallbackStrip(); return; }
      init(items);
    })
    .catch(function () { fallbackStrip(); });

  function fallbackStrip() {
    mount.innerHTML = '<div class="showcase3d-fallback">' +
      PICKS.map(function (id) {
        return '<a href="product.html?id=' + id + '"><img src="assets/img/' + id + '.jpg" alt="" loading="lazy"></a>';
      }).join('') + '</div>';
  }

  function init(items) {
    var W = mount.clientWidth || 320, H = mount.clientHeight || 380;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { fallbackStrip(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 60);
    camera.position.set(0, 0.45, 5.4);
    camera.lookAt(0, 0.05, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    var key = new THREE.DirectionalLight(0xc9a227, 0.55);
    key.position.set(3, 4, 5);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x7c3aed, 0.8);
    rim.position.set(-4, -1, 3);
    scene.add(rim);

    var ring = new THREE.Group();
    scene.add(ring);
    var RADIUS = 2.45, N = items.length;
    var cards = [];
    var loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    items.forEach(function (p, i) {
      var pivot = new THREE.Group();
      pivot.rotation.y = (i / N) * Math.PI * 2;
      var tex = loader.load(p.cover || p.image || ('assets/img/' + p.id + '.jpg'));
      tex.anisotropy = 4;
      var card = new THREE.Mesh(
        new THREE.PlaneGeometry(1.08, 1.5),
        new THREE.MeshBasicMaterial({ map: tex, transparent: false })
      );
      card.position.set(0, 0, RADIUS);
      card.userData.pid = p.id;
      var edge = new THREE.Mesh(
        new THREE.PlaneGeometry(1.16, 1.58),
        new THREE.MeshBasicMaterial({ color: 0xc9a227 })
      );
      edge.position.set(0, 0, RADIUS - 0.012);
      pivot.add(edge);
      pivot.add(card);
      ring.add(pivot);
      cards.push({ pivot: pivot, card: card, product: p, baseAngle: pivot.rotation.y });
    });

    // soft glow disc under the ring
    var glowTex = makeGlowTexture();
    var glow = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 7.5),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.5, depthWrite: false })
    );
    glow.position.set(0, -0.4, -2.2);
    scene.add(glow);

    // floating dust particles
    var pGeo = new THREE.BufferGeometry();
    var pCount = 130, pos = new Float32Array(pCount * 3);
    for (var i = 0; i < pCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x9d6bff, size: 0.035, transparent: true, opacity: 0.7 }));
    scene.add(points);

    function makeGlowTexture() {
      var c = document.createElement('canvas'); c.width = c.height = 256;
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
      grad.addColorStop(0, 'rgba(124,58,237,0.55)');
      grad.addColorStop(0.5, 'rgba(124,58,237,0.18)');
      grad.addColorStop(1, 'rgba(124,58,237,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    }

    // ---- interaction: drag to spin, tap to open ----
    var dragging = false, lastX = 0, vel = 0, moved = 0;
    var autoSpeed = 0.14; // rad/s idle spin
    var el = renderer.domElement;
    el.style.touchAction = 'pan-y';
    el.style.cursor = 'grab';

    el.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; moved = 0; vel = 0;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      var d = dx * 0.008;
      ring.rotation.y += d;
      vel = d * 60;
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = 'grab';
      if (moved < 8) tapPick(e);
    }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    var ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    function tapPick(e) {
      var rect = el.getBoundingClientRect();
      ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      var meshes = cards.map(function (c) { return c.card; });
      var hits = ray.intersectObjects(meshes);
      if (hits.length) window.location.href = 'product.html?id=' + hits[0].object.userData.pid;
    }

    // ---- front-card label ----
    var tmpV = new THREE.Vector3();
    var frontId = null;
    function updateLabel() {
      var best = null, bestZ = -Infinity;
      cards.forEach(function (c) {
        c.card.getWorldPosition(tmpV);
        if (tmpV.z > bestZ) { bestZ = tmpV.z; best = c; }
      });
      if (best && best.product.id !== frontId) {
        frontId = best.product.id;
        labelEl.innerHTML = '<a href="product.html?id=' + best.product.id + '">' +
          '<span class="showcase3d-kicker">Featured</span>' +
          '<b>' + escapeHtml(best.product.name) + '</b>' +
          '<span class="showcase3d-price">$' + best.product.price + '</span>' +
          '<span class="showcase3d-go">View product →</span></a>';
      }
    }
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      });
    }

    // ---- resize ----
    function onResize() {
      var w = mount.clientWidth || 320, h = mount.clientHeight || 380;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(mount);

    // ---- loop ----
    var clock = new THREE.Clock();
    var t = 0;
    (function animate() {
      requestAnimationFrame(animate);
      var dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      if (!dragging) {
        ring.rotation.y += (Math.abs(vel) > 0.02 ? vel * dt : autoSpeed * dt);
        vel *= Math.pow(0.08, dt); // inertia decay
      }
      cards.forEach(function (c, i) {
        c.pivot.position.y = Math.sin(t * 1.3 + i * 1.7) * 0.09;
      });
      points.rotation.y = t * 0.02;
      updateLabel();
      renderer.render(scene, camera);
    })();
  }
})();
