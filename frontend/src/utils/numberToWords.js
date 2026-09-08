const defaultNumbers = ' hai ba bốn năm sáu bảy tám chín';
const units = ('1 một' + defaultNumbers).split(' ');
const tens = ('lẻ mười' + defaultNumbers).split(' ');
const hundreds = ('không một' + defaultNumbers).split(' ');
const blocks = ' nghìn triệu tỷ nghìn triệu tỷ'.split(' ');

export function numberToWords(number) {
    if (!number || number === 0) return 'không đồng';
    
    let str = parseInt(number).toString();
    let result = '';
    
    // Group numbers in blocks of 3
    let groups = [];
    while (str.length > 0) {
        groups.unshift(str.slice(-3));
        str = str.slice(0, -3);
    }
    
    for (let i = 0; i < groups.length; i++) {
        let group = groups[i];
        let groupValue = parseInt(group);
        if (groupValue === 0) continue;
        
        let words = '';
        let numHundreds = Math.floor(groupValue / 100);
        let numTens = Math.floor((groupValue % 100) / 10);
        let numUnits = groupValue % 10;
        
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
    
    result = result.trim() + ' đồng';
    return result.charAt(0).toUpperCase() + result.slice(1);
}
