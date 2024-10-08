import Card from "../components/Card";
import Heading from "../components/Heading";
import InputBox from "../components/InputBox";
import Button from "../components/Button";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ErrorComponent from "../components/ErrorComponent";
import { URL } from "../config";
export default function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorM, setErrorM] = useState("");
  const [validPass, setValidPass] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const response = await axios.post(URL + "/user/signin", {
        email: email,
        password: password,
      });
      setLoading(false);
        localStorage.setItem("token", "Bearer " + response.data.token);
        navigate("/dashboard");
      }
     catch (e: any) {

      setError(true);
      if (e.response.data) setErrorM(e.response.data.message);
      else setErrorM(e.message);
      console.log();
      const temp = error;
      console.log(temp);
      setLoading(false);
      setTimeout(() => {
        setError(false);
      }, 3000);
    }
  }

  useEffect(() => {
    if (password.length >= 8) setValidPass(true);
    else setValidPass(false);
  }, [password, setValidPass]);

  return (
    <div className="w-full h-full flex flex-col justify-center items-center bg-cfbg bg-no-repeat bg-cover bg-center">
      <div className="absolute top-14">
        {errorM != "" && errorM ? <ErrorComponent message={errorM} /> : <></>}
      </div>
      <Card width="auto rounded-xl">
        <Heading title={"Sign In"} subHeading="Don't have an account?" />
        <InputBox
          setFunction={setEmail}
          type="text"
          label="Email"
          placeholder="Enter your email..."
        />
        <InputBox
          setFunction={setPassword}
          type="password"
          label="Password"
          placeholder="Enter your password..."
        />
        {!validPass && (
          <div className="text-[12px] text-red-500">
            Password should have atleast 8 characters
          </div>
        )}
        <Button title={"Sign In"} onClick={onClick} loading={loading} />
      </Card>
    </div>
  );
}
