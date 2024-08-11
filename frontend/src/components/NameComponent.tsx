export default function NameComponent({avatar, name, handle}:{avatar:string, name:string, handle:string}) {
  return (
    <div className="flex flex-col md:flex-row w-full items-center">
      <div className="rounded-full w-20 h-20"><img className="rounded-full" src={avatar}/></div>
      <div className="flex flex-col justify-center mx-5 md:mt-0 mt-2">
        <div className="text-4xl font-bold text-center md:text-left">{name}</div>
        <div className="text-gray-500 text-center md:text-left md:mt-0 mt-2">{handle}</div>
      </div>
    </div>
  );
}
