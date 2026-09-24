import { Link, useNavigate } from "react-router-dom";
import { BsArrowLeft } from "react-icons/bs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const forgetPasswordSchema = z.object({
  email: z.string("Email must be a string").email("Invalid email").min(1, "Email is Required")
});

export type forgetPasswordValue = z.infer<typeof forgetPasswordSchema>;
function ForgetPassword(){
const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<forgetPasswordValue>({
    resolver: zodResolver(forgetPasswordSchema),
    defaultValues: { 
      email: ""
    },
  });

  const submit = ()=>{
    
  }

    return(
        <main className="flex min-h-screen bg-[var(--primaryColor)]">
        <section className="hidden w-[35%] bg-[var(--secondaryColor)] lg:block">
          
      </section>

      <section className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-[65%] reletive">
        <Link to="/login" className="flex absolute top-[20%] left-[44%] items-center justify-center w-[3rem] h-[3rem] bg-[var(--greey)] rounded-[50%] shadow-sm shadow-black/40 mb-[2rem]">
                             <BsArrowLeft className="text-[19px]" />
        </Link>
        <h1 className="text-[20px] font-[600]">Forget Password?</h1>
        <p className="text-[14px] text-[var(--grey)]">If you're forgetten your password, please enter your email to reset.</p>
        
        <form action="" onSubmit={handleSubmit(submit)} className="flex flex-col w-[60%] h-[35%] mt-[2rem]">
             <label htmlFor="email" className="text-[16px]  mb-[4px]">Email</label>
             <input {...register("email")}  type="text" className="w-full h-[28%] border focus-ring-0 outline-none rounded-[12px] pl-[9px]"/>
            <p className="text-red-500 text-[13px] mt-[2px]">{errors.email?.message}</p>

             <button type="submit" className="w-full h-[28%] mt-[1rem] bg-[var(--secondaryColor)] rounded-[12px]">Continue</button>
        </form>


      </section>
    </main>
    )
}

export default ForgetPassword