import type { Product, SelectedOption } from '@/types';

/**
 * The options a customer gets when they add a dish without opening a full
 * option picker: the chef-selected default, or the first choice of a required
 * group. Optional groups stay unselected.
 */
export function defaultSelectedOptions(product: Product): SelectedOption[] {
  return product.optionGroups.flatMap((group) => {
    const option =
      group.options.find((candidate) => candidate.isDefault) ??
      (group.required ? group.options[0] : undefined);
    if (!option) return [];
    return [
      {
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceDelta: option.priceDelta,
      },
    ];
  });
}

/** Unit price including the selected option deltas. */
export function optionAdjustedPrice(product: Product, options: SelectedOption[] = []): number {
  return options.reduce((total, option) => total + option.priceDelta, product.price);
}
