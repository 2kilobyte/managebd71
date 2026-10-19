"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import toast from 'react-hot-toast';

type Player = {
    ign: string;
    discord: string;
    realName: string;
};

type TeamForm = {
    teamName: string;
    teamLogo: string;
    // teamCode: string;
    teamShortName: string;
    mobileNumber: string;
    transactionId: string;
    players: Player[];
    leaderIndex: number;
};

type TournamentPaymentInfo = {
    entryFeeAmount?: number | null;
    entryFeeBkashNumber?: string | null;
    entryFeeRefundable?: boolean;
};

const initialPlayer: Player = { ign: "", discord: "", realName: "" };

const RegisterTeam: React.FC = () => {
    const [form, setForm] = useState<TeamForm>({
        teamName: "",
        teamLogo: "",
        // teamCode: "",
        teamShortName: "",
        mobileNumber: "",
        transactionId: "",
        players: Array(1).fill(initialPlayer),
        leaderIndex: 0,
    });


    const [showDiscordImage, setShowDiscordImage] = useState(false);
    const [showTeamLogoImage, setShowTeamLogoImage] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState<TournamentPaymentInfo | null>(null);
    const [paymentInfoLoading, setPaymentInfoLoading] = useState(true);

    useEffect(() => {
        const pathParts = window.location.pathname.split("/").filter(Boolean);
        const tournamentId = pathParts[pathParts.length - 1] === "register" ? pathParts[pathParts.length - 2] : pathParts[0];
        if (!tournamentId) {
            setPaymentInfoLoading(false);
            return;
        }
        fetch(`/api/tournaments/details?tournamentId=${encodeURIComponent(tournamentId)}`, { cache: "no-store" })
            .then(async (response) => {
                if (!response.ok) throw new Error("Could not load tournament payment details.");
                const data = await response.json();
                setPaymentInfo(data.tournament || null);
            })
            .catch(() => setPaymentInfo(null))
            .finally(() => setPaymentInfoLoading(false));
    }, []);

    const entryFeeAmount = Number(paymentInfo?.entryFeeAmount) > 0 ? Number(paymentInfo?.entryFeeAmount) : null;


    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
        idx?: number,
        field?: keyof Player
    ) => {
        const { name, value } = e.target;
        if (typeof idx === "number" && field) {
            const updatedPlayers = [...form.players];
            updatedPlayers[idx] = { ...updatedPlayers[idx], [field]: value };
            setForm({ ...form, players: updatedPlayers });
        } else if (name === "leaderIndex") {
            setForm({ ...form, leaderIndex: Number(value) });
        } else {
            setForm({ ...form, [name]: value });
        }
    };




    


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading('Submitting...');
        console.log(form.teamShortName.length);
        
        if (form.teamShortName.length > 4) {
            toast.error('Team short name max 4 letter', { id: toastId })
            return;
        }
        if (entryFeeAmount !== null && !form.transactionId.trim()) {
            toast.error('Enter the bKash transaction ID to register for this paid tournament.', { id: toastId });
            return;
        }

        const transformedPlayers = form.players.map((player, index) => ({
            ign: player.ign,
            isLeader: index === form.leaderIndex,
            discordName: player.discord,
            fullName: player.realName,
        }));

        let tournamentId = "";
        if (typeof window !== "undefined") {
            const pathParts = window.location.pathname.split("/").filter(Boolean);
            if (pathParts.length >= 2 && pathParts[pathParts.length - 1] === "register") {
                tournamentId = pathParts[pathParts.length - 2];
            }
        }
        

        const payload = {
            teamName: form.teamName,
            teamLogo: form.teamLogo,
            mobileNumber: form.mobileNumber,
            transactionId: form.transactionId.trim(),
            // teamCode: form.teamCode,
            teamShortName: form.teamShortName,
            players: transformedPlayers,
        };

        try {
            const response = await fetch(`/api/tournaments/registation?tournamentId=${tournamentId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                
                toast.error(errorData.message || "Failed to submit", { id: toastId });
                return;
            }

            const data = await response.json();

            // Set success message
            toast.success(data.message, { id: toastId })

            // Optionally reset form
            setForm({
                teamName: "",
                teamLogo: "",
                // teamCode: "",
                teamShortName: "",
                mobileNumber: "",
                transactionId: "",
                players: [initialPlayer],
                leaderIndex: 0,
            });
            
        } catch (error: unknown) {
            //@ts-expect-error Reason: server providing that data
            toast.error(error.message || "An unexpected error occurred.", { id: toastId });
        }
    };


    return (
        <form onSubmit={handleSubmit} className="admin-form admin-form-wide space-y-6">
            <h2 className="text-2xl font-bold mb-4">Register Tournament Team</h2>

            {!paymentInfoLoading && entryFeeAmount !== null && (
                <section className="rounded-xl border border-amber-400/60 bg-gray-900 p-5 text-white" aria-label="Tournament entry fee">
                    <h3 className="text-lg font-bold text-amber-300">Tournament Entry Fee</h3>
                    <p className="mt-2">Entry fee: <strong>৳ {entryFeeAmount.toLocaleString("en-BD")}</strong> <span>({paymentInfo?.entryFeeRefundable ? "Refundable" : "Non-refundable"})</span></p>
                    {paymentInfo?.entryFeeBkashNumber && <p className="mt-1">Send Money to bKash: <strong className="font-mono">{paymentInfo.entryFeeBkashNumber}</strong></p>}
                    <p className="mt-2 text-sm text-gray-300">Use bKash Send Money and send the exact entry-fee amount. Enter the transaction ID below.</p>
                </section>
            )}

            <div>
                <label className="block font-medium mb-1">
                    Team Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="teamName"
                    required
                    value={form.teamName}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                />
            </div>
            <div>
                <label className="block font-medium mb-1">
                    Team Short Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="teamShortName"
                    required
                    placeholder="Write short name max 4 letter"
                    value={form.teamShortName}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                />
            </div>

            {/* when someone click on discord name filed show this image section */
            showTeamLogoImage &&
            <div className=" relative">
                <Image priority className=" absolute -right-[75%] -bottom-[410px] border-1 border-amber-400 rounded-lg float" src="/img/copy.png" width={500} height={500} alt="Discord" />
                <Image priority className=" absolute -right-[75%] -top-[215px] border-1 border-amber-400 rounded-lg float" src="/img/image-upload.png" width={500} height={500} alt="Discord" />
            </div>
            }

            <div>
                <label className="block font-medium mb-1">
                    Team Logo URL <span className="text-red-500">*</span>
                </label>
                <input
                    type="url"
                    name="teamLogo"
                    required
                    value={form.teamLogo}
                    onChange={handleChange}
                    onFocus={() => setShowTeamLogoImage(true)}
                    onBlur={() => setShowTeamLogoImage(false)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Paste direct image link here"
                />
                <p className="text-sm text-gray-600 mt-1">
                    <strong>How to upload:</strong> Go to{" "}
                    <a
                        href="https://postimages.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                    >
                        https://postimages.org/
                    </a>
                    . Choose the first option (don’t resize image, no expiration). Upload a <b>square</b> image. After uploading, copy the <b>Direct link</b> and paste it here.
                </p>
            </div>

            <div>
                <label className="block font-medium mb-1">
                    Team Leader Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                    type="tel"
                    name="mobileNumber"
                    required
                    pattern="[0-9]{10,15}"
                    value={form.mobileNumber}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Enter mobile number"
                />
            </div>

            {entryFeeAmount !== null && (
                <div>
                    <label className="block font-medium mb-1" htmlFor="transactionId">
                        bKash Transaction ID <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="transactionId"
                        type="text"
                        name="transactionId"
                        required
                        minLength={1}
                        maxLength={64}
                        value={form.transactionId}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter the transaction ID from your bKash receipt"
                    />
                </div>
            )}

            {/* <div>
                <label className="block font-medium mb-1">
                    Team Code <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-row">
                    <input
                        type="text"
                        name="teamCode"
                        placeholder="Enter team code"
                        required
                        value={form.teamCode}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2 outline-none hover:outline-none"
                    />
                    <Link
                        href="https://discord.com/channels/1084550999722692628/1409526606527205508"
                        target="_blank"
                        className="bg-orange-500 rounded hover:bg-orange-600 w-[120px] -ml-[10px] py-2 text-white flex item-center justify-center"
                    >
                        Get Code
                    </Link>
                </div>
            </div> */}


            {/* when someone click on discord name filed show this image section */
            showDiscordImage &&
            <div className=" relative">
                <Image priority className=" absolute -right-[75%] -top-[150px] border-1 border-amber-400 rounded-lg float" src="/img/discord.png" width={500} height={500} alt="Discord" />
            </div>
            }

            <div>
                <h3 className="font-semibold mb-2">Players</h3>
                <div className="grid grid-cols-1 gap-4">
                    {form.players.map((player, idx) => (
                        <div
                            key={idx}
                            className="border rounded p-3 flex flex-col gap-2"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">
                                    Player {idx + 1}
                                </span>
                                {form.players.length > 1 && idx !== 0 && (
                                    <button
                                        type="button"
                                        className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded"
                                        onClick={() => {
                                            setForm((prev) => {
                                                const updatedPlayers = prev.players.filter((_, i) => i !== idx);
                                                let newLeaderIndex = prev.leaderIndex;
                                                // Adjust leaderIndex if needed
                                                if (idx === prev.leaderIndex) {
                                                    newLeaderIndex = 0;
                                                } else if (idx < prev.leaderIndex) {
                                                    newLeaderIndex = prev.leaderIndex - 1;
                                                }
                                                return {
                                                    ...prev,
                                                    players: updatedPlayers,
                                                    leaderIndex: newLeaderIndex,
                                                };
                                            });
                                        }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-row gap-2">
                                <input
                                    type="text"
                                    placeholder="In-Game Name"
                                    required
                                    value={player.ign}
                                    onChange={(e) => handleChange(e, idx, "ign")}
                                    className="border rounded px-2 py-1 flex-1"
                                />
                                <input
                                    type="text"
                                    placeholder="Discord User ID"
                                    required
                                    value={player.discord}
                                    title="Check the example on the right side of the form."
                                    onFocus={() => setShowDiscordImage(true)}
                                    onBlur={() => setShowDiscordImage(false)}
                                    onChange={(e) => handleChange(e, idx, "discord")}
                                    className="border rounded px-2 py-1 flex-1"
                                />
                                <input
                                    type="text"
                                    placeholder="Real Name"
                                    required
                                    value={player.realName}
                                    onChange={(e) => handleChange(e, idx, "realName")}
                                    className="border rounded px-2 py-1 flex-1"
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    className="mt-2 bg-orange-500 text-white px-4 py-1 rounded hover:bg-orange-600 font-medium"
                    onClick={() =>
                        setForm((prev) => ({
                            ...prev,
                            players: [
                                ...prev.players,
                                { ign: "", discord: "", realName: "" },
                            ],
                        }))
                    }
                >
                    + Add Player
                </button>
            </div>

            <div>
                <label className="block font-medium mb-1">
                    Select Team Leader <span className="text-red-500">*</span>
                </label>
                {form.players.some((player) => player.ign.trim()) && (
                    <select
                        name="leaderIndex"
                        value={form.leaderIndex}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2 bg-gray-800 text-white"
                    >
                        {form.players.map((player, idx) =>
                            player.ign.trim() ? (
                                <option
                                    key={idx}
                                    value={idx}
                                    className="bg-gray-800 text-white"
                                >
                                    {player.ign}
                                </option>
                            ) : null
                        )}
                    </select>
                )}
            </div>

            <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700"
            >
                Register
            </button>


        </form>
    );
};

export default RegisterTeam;
