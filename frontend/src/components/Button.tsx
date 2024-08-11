import SpinLoader from "./SpinLoader";
export default function Button({
  title,
  loading,
  onClick,
}: {
  title: string;
  loading:boolean;
  onClick: () => void;
}) {
  return (
    <div className="w-full mt-5">
      <button onClick={onClick} className="w-full text-center bg-black text-white font-medium py-1 rounded-md flex items-center justify-center">
        {loading? <SpinLoader/> : title}
      </button>
    </div>
  );
}
