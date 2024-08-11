export default function Heading({
  title,
  subHeading,
}: {
  title: string;
  subHeading: string;
}) {
  return (
    <div className="flex flex-col justify-center items-center">
      <div className="text-2xl font-bold">{title}</div>
      <div className="text-gray-500">
        {subHeading}&nbsp;
        <a href={title=="Sign In"? "/signup":"/signin"} className="underline">{title == "Sign In" ? "Create an account" : "Log in"}</a>
      </div>
    </div>
  );
}
