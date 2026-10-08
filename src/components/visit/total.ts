export function visitTotalClient(items: { cost: string; approved: boolean }[]) {
  return items.filter((i) => i.approved).reduce((a, i) => a + Number(i.cost), 0);
}
