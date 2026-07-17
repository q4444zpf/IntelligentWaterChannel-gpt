import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

export function useCanvasChart(draw) {
  const canvasRef = ref(null);
  const redraw = () => draw(canvasRef.value);

  onMounted(() => {
    nextTick(redraw);
    window.addEventListener('resize', redraw);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', redraw);
  });

  return { canvasRef, redraw };
}
