// Веб: высота, которая нужна <textarea>, чтобы показать весь текст без прокрутки.
// Меряем на невидимой копии поля: у самого поля scrollHeight не бывает меньше его высоты,
// а сбрасывать ему высоту ради замера нельзя — поле на миг схлопывается и страница дёргается.

let mirror: HTMLTextAreaElement | null = null;

// всё, от чего зависит перенос строк и высота текста
const COPIED_STYLES = [
    'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
    'textTransform', 'wordSpacing', 'whiteSpace', 'overflowWrap', 'wordBreak', 'tabSize',
] as const;

export function textareaContentHeight(textarea: HTMLTextAreaElement): number {
    if (!mirror) {
        mirror = document.createElement('textarea');
        mirror.setAttribute('aria-hidden', 'true');
        mirror.tabIndex = -1;
        Object.assign(mirror.style, {
            position: 'absolute',
            top: '0',
            left: '-9999px',
            visibility: 'hidden',
            height: '0',
            minHeight: '0',
            overflow: 'hidden',
            pointerEvents: 'none',
        });
        document.body.appendChild(mirror);
    }

    const computed = window.getComputedStyle(textarea);
    for (const name of COPIED_STYLES) {
        mirror.style[name] = computed[name];
    }
    // пустая последняя строка (Enter в конце) тоже должна занимать место
    mirror.value = textarea.value.endsWith('\n') ? `${textarea.value} ` : textarea.value || ' ';

    const borders = parseFloat(computed.borderTopWidth) + parseFloat(computed.borderBottomWidth);
    return Math.ceil(mirror.scrollHeight + (computed.boxSizing === 'border-box' ? borders : 0));
}
