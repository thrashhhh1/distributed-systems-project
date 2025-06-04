export function getUniformInterval(min = 500, max = 2000): number {
    return Math.random() * (max - min) + min;
  }
  