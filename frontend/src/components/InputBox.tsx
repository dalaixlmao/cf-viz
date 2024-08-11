import { Dispatch, SetStateAction } from "react";

export default function InputBox({setFunction, label, type, placeholder}:{setFunction:Dispatch<SetStateAction<string>> , label:string, type:string, placeholder:string}){
    return <div className="flex flex-col">
        <div className="font-medium mt-3">{label}</div>
        <input onChange={(e)=>{setFunction(e.target.value)}} className="border-2 rounded-md p-1 px-2 mt-1" type={type} placeholder={placeholder}/>
    </div>
}