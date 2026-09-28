import { useNavigate } from "react-router-dom"


function NotFound(){
    const navigate = useNavigate()

    const notFoundGoBack = ()=>{
       navigate(-1)
    }
    return(
        <section className="w-screen h-[100vh] bg-cover bg-center bg-[image:var(--notFoundBg)] flex flex-col justify-center items-center px-[5rem] pb-[7rem] max-[650px]:bg-[image:var(--mobileNotFoundBg)] max-[480px]:px-[1rem]">
             <p className="text-[90px] font-[800] max-[480px]:text-[70px]">404</p>
             <p className="max-[480px]:font-[600] max-[480px]:mb-[5rem] max-[255px]:text-[13px] max-[650px]:font-[600] max-[650px]:mb-[3rem]">Oops! You seem to be lost</p>
             <p className="max-[480px]:mt-[0rem] max-[480px]:text-[14px] max-[480px]:px-[1rem] max-[328px]:text-[13px] max-[306px]:text-[10px] max-[753px]:text-[14px] max-[753px]:mt-[2rem]">The page you're are looking for doesn't seem to exist or may have been moved.</p>
             <button className="w-[17%] h-[8%] bg-black hover:shadow-sm hover:shadow-green-300 active:scale-95 hover:scale-101 transition-transform mt-[2rem] rounded-[4px] text-[14px] text-white font-[500] max-[480px]:w-[60%] max-[480px]:h-[7%] max-[306px]:h-[6%] max-[650px]:w-[50%] max-[650px]:h-[7%] max-[987px]:h-[6%] max-[987px]:w-[23%]" onClick={notFoundGoBack}>Go Back</button>
        </section>
    )
}

export default NotFound