/**
 * SpendNote - GitHub Pages 交互脚本
 * 轻松记账，智慧生活
 */

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', function() {
  // 平滑滚动
  initSmoothScroll();

  // 导航栏滚动效果
  initNavbarScroll();

  // 元素滚动动画
  initScrollAnimation();
});

/**
 * 平滑滚动到锚点
 */
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();

      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const navHeight = document.querySelector('.navbar').offsetHeight;
        const targetPosition = targetElement.offsetTop - navHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * 导航栏滚动效果
 */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', function() {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
      navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    } else {
      navbar.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
  });
}

/**
 * 元素滚动动画
 */
function initScrollAnimation() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // 观察需要动画的元素
  const animateElements = document.querySelectorAll('.feature-card, .screenshot-card');
  animateElements.forEach(function(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

/**
 * 添加动画类
 */
const style = document.createElement('style');
style.textContent = `
  .animate-in {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
`;
document.head.appendChild(style);

/**
 * 控制台输出
 */
console.log('%c SpendNote - 轻松记账，智慧生活', 'color: #10b981; font-size: 20px; font-weight: bold;');
