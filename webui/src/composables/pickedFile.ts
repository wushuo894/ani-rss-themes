/**
 * 从 v-file-input 的 model 里取出那一个文件。
 *
 * 它的形状跟着 multiple 走 —— VFileInput 出口那一步写的是
 * `val => !props.multiple && Array.isArray(val) ? val[0] : val`：
 * **单选给的是 File 本身，多选才是 File[]**。
 *
 * 只按数组接的代价很实：`:disabled="!pkg?.length"` 在单选下拿到的是
 * File.length === undefined，按钮从头灰到尾 —— 选完文件也点不动，
 * 换界面和导入备份两处就是这么废掉的。反过来只按 File 接则是永远拿不到文件。
 *
 * 所以这件事只在这里判一次，各处不要再自己写 Array.isArray。
 */
export const pickedFile = (v: File | File[] | null | undefined): File | undefined =>
    (Array.isArray(v) ? v[0] : v) ?? undefined
