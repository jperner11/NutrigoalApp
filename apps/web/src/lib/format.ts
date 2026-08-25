export const formatPrice = (price: number) =>
  price === 0 ? '$0' : `$${price.toFixed(price % 1 === 0 ? 0 : 2)}`
