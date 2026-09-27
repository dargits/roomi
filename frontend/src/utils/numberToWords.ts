const defaultNumbers = ' hai ba bốn năm sáu bảy tám chín';
const units = ('1 một' + defaultNumbers).split(' ');
const tens = ('lẻ mười' + defaultNumbers).split(' ');
const hundreds = ('không một' + defaultNumbers).split(' ');
const blocks = ' nghìn triệu tỷ nghìn triệu tỷ'.split(' ');

const digitWords = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

export function numberToWords(number: number | string | null | undefined): string {
  if (number === null || number === undefined || number === '' || number === 0 || number === '0') {
    return 'không đồng';
  }

  const rawStr = String(number).trim();
  const [intStrRaw, decStrRaw] = rawStr.split('.');
  const intVal = parseInt(intStrRaw || '0', 10);

  let str = Math.abs(intVal).toString();
  let result = '';

  if (intVal === 0 && (!decStrRaw || parseInt(decStrRaw, 10) === 0)) {
    return 'không đồng';
  }

  if (intVal === 0) {
    result = 'không ';
  } else {
    // Group numbers in blocks of 3
    const groups: string[] = [];
    while (str.length > 0) {
      groups.unshift(str.slice(-3));
      str = str.slice(0, -3);
    }

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const groupValue = parseInt(group, 10);
      if (groupValue === 0) continue;

      let words = '';
      const numHundreds = Math.floor(groupValue / 100);
      const numTens = Math.floor((groupValue % 100) / 10);
      const numUnits = groupValue % 10;

      if (group.length === 3) {
        words += hundreds[numHundreds] + ' trăm ';
        if (numTens === 0 && numUnits !== 0) {
          words += 'lẻ ';
        }
      }

      if (numTens === 1) {
        words += 'mười ';
      } else if (numTens > 1) {
        words += units[numTens] + ' mươi ';
      }

      if (numUnits === 1 && numTens > 1) {
        words += 'mốt ';
      } else if (numUnits === 5 && numTens > 0) {
        words += 'lăm ';
      } else if (numUnits > 0) {
        words += units[numUnits] + ' ';
      }

      result += words + (blocks[groups.length - 1 - i] || '') + ' ';
    }
  }

  // Handle decimal/odd cents if present
  if (decStrRaw && parseInt(decStrRaw, 10) > 0) {
    result = result.trim() + ' phẩy ';
    for (let j = 0; j < decStrRaw.length; j++) {
      const d = parseInt(decStrRaw[j], 10);
      result += (digitWords[d] || '') + ' ';
    }
  }

  result = result.trim() + ' đồng';
  return result.charAt(0).toUpperCase() + result.slice(1);
}
