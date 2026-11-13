import type { Product, SelectedOption } from "@/types";

export function validateProductOptions(
  product: Product,
  selectedOptions: SelectedOption[]
): boolean {
  // التأكد من صحة كل مجموعة خيارات
  for (const group of product.optionGroups) {
    const selectedInGroup = selectedOptions.filter(
      (option) => option.groupId === group.id
    );

    const selectedCount = selectedInGroup.length;

    // التحقق من الحد الأدنى والأقصى للاختيارات
    if (
      selectedCount < group.minSelections ||
      selectedCount > group.maxSelections
    ) {
      return false;
    }

    // التأكد أن كل خيار مختار موجود ضمن خيارات المجموعة
    for (const selected of selectedInGroup) {
      const isValidOption = group.options.some(
        (option) => option.id === selected.optionId
      );

      if (!isValidOption) {
        return false;
      }
    }
  }

  // التأكد أن كل اختيار تابع لمجموعة موجودة بالمنتج
  for (const selected of selectedOptions) {
    const groupExists = product.optionGroups.some(
      (group) => group.id === selected.groupId
    );

    if (!groupExists) {
      return false;
    }
  }

  return true;
}