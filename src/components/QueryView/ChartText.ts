// rough width of a 12px character, where text can't be measured
export const CHAR_WIDTH = 7;

// A label's width at 12px, measured on a canvas; estimated where there is none (tests).
export const textWidth = (text: string, font: string) => {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return CHAR_WIDTH * text.length;
  context.font = `12px ${font}`;
  return context.measureText(text).width;
};
