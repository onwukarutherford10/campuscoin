import { Link, useNavigate } from "react-router-dom";
import { BsArrowLeft } from "react-icons/bs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {  useState } from "react";
import { Eye, EyeOff } from "lucide-react";


const resetPasswordSchema = z.object({
  newPassword: z.string("Password must be a string").min(8, "Password must be upto 8 charaters"),
  confirmPassword: z.string("Password must be a string").min(8, "Password must be upto 8 charaters"),
}).refine((data) => data.confirmPassword === data.newPassword, {
  message: "Passwords do not match", 
  path: ["confirmPassword"]
});

export type resetPasswordValue = z.infer<typeof resetPasswordSchema>


function ResetPassword(){
   const{
      reset,
      register,
      handleSubmit,
      formState: {errors, isSubmitting}
   } = useForm<resetPasswordValue>({
      resolver: zodResolver(resetPasswordSchema),
      defaultValues: {
        newPassword: "",
        confirmPassword: ""
      }
   }
   )

   const [errorMesg, setErrorMesg] = useState<boolean>(false)
    const navigate = useNavigate()
    const onSubmit = (data: resetPasswordValue)=>{
      if(data.newPassword === data.confirmPassword){
         navigate("/login")
      }else{
          setErrorMesg(true)
      }
    }

    const [showPassword, setShowPassword] = useState<boolean>(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)

    return(
        <main className="flex min-h-screen bg-[var(--primaryColor)]">
      <section className="hidden w-[35%] bg-[var(--secondaryColor)] lg:block">
          
      </section>

      <section className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-[65%] reletive">
        <Link to="/login" className="flex absolute top-[20%] left-[44%] items-center justify-center w-[3rem] h-[3rem] bg-[var(--greey)] rounded-[50%] shadow-sm shadow-black/40 mb-[2rem]">
                             <BsArrowLeft className="text-[19px]" />
        </Link>
        <h1 className="text-[20px] font-[600]">Reset Password</h1>
        <p className="text-[14px] text-[var(--grey)]">Please enter your new password.</p>
        
         <form action="" onClick={handleSubmit(onSubmit)} className="w-[60%] h-[50%] flex justify-center items-center flex-col mt-[5px]">
                 <section className="w-full h-[40%] flex flex-col "> 
                             <label htmlFor="newPassword" className="text-[13px]">New Password</label>

                             <section className="border mt-[3px] w-[100%] h-[60%] rounded-[10px] pl-[8px] flex items-center">
                                   <input type={showPassword? "password" : "text"} 
                                   id="newPassword"
                                       {...register("newPassword")} 
                                       className="outline-none focus-ring-0 mt-[3px] w-[90%] h-[100%] rounded-[10px] pb-[2px]"
                              
                                     />
                                     <button className="w-[10%] h-[100%] flex justify-center items-center" onClick={()=> setShowPassword(!showPassword)} aria-label={showPassword? "Hide password": "Show Password"}>
                                        {showPassword ?  <EyeOff size={18} /> : <Eye size={18} />}
                                     </button>
                             </section>
                              
                              <p className="text-[13px] text-red-500 mt-[2px]">{errors.newPassword?.message}</p> 
                 </section>
                           
                  <section className="w-full h-[40%] flex flex-col ">
                              <label htmlFor="confirmPassword" className="text-[13px]">Confirm Password</label>
                              <section className="border mt-[3px] w-[100%] h-[60%] rounded-[10px] pl-[8px] flex items-center">
                                   <input type={showConfirmPassword? "password": "text"} 
                                       id="confirmPassword"
                                       {...register("confirmPassword")} 
                                       className="outline-none focus-ring-0 mt-[3px] w-[90%] h-[100%] rounded-[10px] pb-[2px]"
                              
                                     />
                                     <button className="w-[10%] h-[100%] flex justify-center items-center" onClick={()=> setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword? "Hide password": "Show Password"}>
                                        {showConfirmPassword ?  <EyeOff size={18} /> :<Eye size={18} />}
                                     </button>
                             </section>
                               <p className="text-[13px] text-red-500 mt-[3px]">{errors.confirmPassword?.message}</p>
                  </section>
                              

                               <button type="submit" className="w-[100%] h-[24%] bg-[var(--secondaryColor)] text-white rounded-[14px] mt-[1rem]">Continue</button>
          </form>
        

      </section>
    </main>
    )
}

export default ResetPassword