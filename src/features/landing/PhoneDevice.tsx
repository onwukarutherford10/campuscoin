import { Signal, Wifi } from "lucide-react";
import {
  BalanceScreen,
  BudgetsScreen,
  CategoriesScreen,
  InsightsScreen,
  SavingsScreen,
  TransactionsScreen,
} from "./PhoneScreens";

const SCREENS = [
  BalanceScreen,
  TransactionsScreen,
  CategoriesScreen,
  SavingsScreen,
  InsightsScreen,
  BudgetsScreen,
];

interface PhoneDeviceProps {
  /** Index of the active screen (0–5), driven by the scroll story. */
  screen?: number;
}

/** Premium phone frame containing the six Campus Coin product states. */
export function PhoneDevice({ screen = 0 }: PhoneDeviceProps) {
  return (
    <div className="w-[276px] rounded-[2.6rem] bg-black p-2.5 shadow-[0_50px_100px_-25px_rgba(0,0,0,0.8)] ring-1 ring-white/15 sm:w-[300px]">
      <div className="relative h-[548px] overflow-hidden rounded-[2.1rem] bg-white sm:h-[600px]">
        {/* Status bar + dynamic island */}
        <div className="relative z-20 flex items-center justify-between px-5 pb-1 pt-3 text-[11px] font-semibold text-gray-900">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <Signal size={12} />
            <Wifi size={12} />
            <span className="inline-block h-2.5 w-5 rounded-[3px] border border-gray-900">
              <span className="block h-full w-3/4 rounded-[1px] bg-gray-900" />
            </span>
          </span>
        </div>
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-2.5 z-30 h-5 w-20 -translate-x-1/2 rounded-full bg-black"
        />

        {/* Screen states — crossfade/slide between them */}
        <div className="relative h-[calc(100%-34px)]">
          {SCREENS.map((Screen, index) => (
            <div
              key={index}
              className="phone-screen"
              data-idx={index}
              data-active={index === screen}
              aria-hidden={index !== screen}
            >
              <Screen />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PhoneDevice;
