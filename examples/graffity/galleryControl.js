(function() {
  var moving = true;
  document.addEventListener('touchmove', function (e) {
    e.preventDefault();
  });
  var swiper = new Swiper('.swiper-container', {
    slidesPerView: 6,
    centeredSlides: false,
    setWrapperSize: true,
    paginationClickable: false,
    spaceBetween: 5,
    direction: 'vertical',
    slidesOffsetBefore: 5,
    slidesOffsetAfter: 5,
    shortSwipes: false,
    allowTouchMove: false,
    timer: 0,
    touchedSlide: null,
    roundLengths: true,
    onDoubleTap(e) {
      e.preventDefault();
    },
    onSliderMove: function (swiper, e) {
    moving = false;
    },
    onTouchMove: function (swiper, e) {
      const self = window.app;
      const scene = self.scene;

      scene.children.forEach((child, i) => {
        if (child.name === 'planeForMesh') {
          scene.remove(child);
        }
      });
      self.requestAnimationFrame();

      const timer = new Date();
      if ((timer - this.timer) < 200) {
        return;
      }
      this.timer = timer;
      let normX = e.clientX / self.width;
      let normY = e.clientY / self.height;
      self.tapPos = { x: 2 * normX - 1, y: -2 * normY + 1 };
      self.ar.hitTest(normX, normY).then(data => {
        //self.onARHitTest(data);
        const planes = data.planes;
        planes.forEach(plane => {
          self.addPlane(plane);
        });
      }).catch(e => e);
    },
    onTouchStart: function (swiper, e) {
      this.touchedSlide = e.target;
      this.touchedSlide.style.transitionDuration = '0.2s';
      this.touchedSlide.style.opacity = 0;
    },
    onTouchEnd: function (swiper, e) {
      const self = window.app;

      this.touchedSlide.style.opacity = 1;
      this.touchedSlide = null;

      let normX = e.clientX / self.width;
      let normY = e.clientY / self.height;
      self.tapPos = { x: 2 * normX - 1, y: -2 * normY + 1 };
      console.log(self.scene.children);
      self.ar.hitTest(normX, normY).then(data => {
        self.onARHitTest(data);
      });
    },
  });
}());
