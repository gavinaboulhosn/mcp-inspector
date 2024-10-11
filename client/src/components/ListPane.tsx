import { Button } from "./ui/button";

type ListPaneProps<T> = {
  items: T[];
  listItems: () => void;
  setSelectedItem: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  title: string;
  buttonText: string;
};

const ListPane = <T extends object>({
  items,
  listItems,
  setSelectedItem,
  renderItem,
  title,
  buttonText,
}: ListPaneProps<T>) => (
  <div className="bg-white rounded-lg shadow">
    <div className="p-4 border-b border-gray-200">
      <h3 className="font-semibold">{title}</h3>
    </div>
    <div className="p-4">
      <Button variant="outline" className="w-full mb-4" onClick={listItems}>
        {buttonText}
      </Button>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center p-2 rounded hover:bg-gray-50 cursor-pointer"
            onClick={() => setSelectedItem(item)}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ListPane;