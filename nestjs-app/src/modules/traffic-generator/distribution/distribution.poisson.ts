export function getPoissonInterval(lambda: number = 1): number {
    return -Math.log(1 - Math.random()) / lambda * 1000;
  }
  