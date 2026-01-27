import { useState } from "react";

export default function ButtonGroup() {
  const [activeButton, setActiveButton] = useState(null); // tracks active button

  const buttons = ["Admin", "Employee", "Client"];

  return (
    <div className="flex gap-4">
      {buttons.map((label, index) => (
        <button
          key={index}
          onClick={() => setActiveButton(index)}
          className={`px-4 py-2 rounded text-black bg-white transition-colors duration-300  ${
            activeButton === index ? "shadow-[10px_10px_20px] shadow-[#D149B3]" : "shadow-[10px_10px_20px] shadow-gray-500"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export { ButtonGroup };
