// Keep Markdown table semantics while allowing wide comparisons to scroll.
export default function rehypeTables() {
  return function transform(tree) {
    function wrapTables(node) {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        if (child.type === "element" && child.tagName === "table") {
          return {
            type: "element",
            tagName: "div",
            properties: {
              className: ["ll-table-scroll"],
              tabIndex: 0,
              role: "region",
              ariaLabel: "Tableau à faire défiler horizontalement",
            },
            children: [child],
          };
        }
        wrapTables(child);
        return child;
      });
    }
    wrapTables(tree);
  };
}
