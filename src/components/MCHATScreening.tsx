// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { ChevronLeft, ChevronRight, Activity, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface Question {
    id: number;
    text: string;
    isReverseScored: boolean; // if true, 'Yes' is an at-risk answer
    example?: string;
    insight?: string; // Persuasive sales hook explaining how Aminy helps with this specific deficit
}

const MCH_QUESTIONS: Question[] = [
    { id: 1, text: "If you point at something across the room, does your child look at it?", isReverseScored: false, example: "(FOR EXAMPLE, if you point at a toy or an animal, does your child look at the toy or animal?)", insight: "Joint attention (looking at what you look at) is a foundational social skill. Aminy's care plans include easy, fun 5-minute games you can play at home to gently build this connection." },
    { id: 2, text: "Have you ever wondered if your child might be deaf?", isReverseScored: true },
    { id: 3, text: "Does your child play pretend or make-believe?", isReverseScored: false, example: "(FOR EXAMPLE, pretend to drink from an empty cup, pretend to talk on a phone, or pretend to feed a doll or stuffed animal?)" },
    { id: 4, text: "Does your child like climbing on things?", isReverseScored: false, example: "(FOR EXAMPLE, furniture, playground equipment, or stairs)" },
    { id: 5, text: "Does your child make unusual finger movements near their eyes?", isReverseScored: true, example: "(FOR EXAMPLE, does your child wiggle their fingers close to their eyes?)" },
    { id: 6, text: "Does your child point with one finger to ask for something or to get help?", isReverseScored: false, example: "(FOR EXAMPLE, pointing to a snack or toy that is out of reach)", insight: "Communicating needs is a huge milestone. Aminy's AI coach provides exact scripts for 'Functional Communication Training' (FCT) to rapidly help your child replace frustration with clear requests." },
    { id: 7, text: "Does your child point with one finger to show you something interesting?", isReverseScored: false, example: "(FOR EXAMPLE, pointing to an airplane in the sky or a big truck in the road)" },
    { id: 8, text: "Is your child interested in other children?", isReverseScored: false, example: "(FOR EXAMPLE, does your child watch other children, smile at them, or go to them?)" },
    { id: 9, text: "Does your child show you things by bringing them to you or holding them up for you to see?", isReverseScored: false, example: "Not to get help, but just to share." },
    { id: 10, text: "Does your child respond when you call their name?", isReverseScored: false, example: "(FOR EXAMPLE, does your child look up, talk or babble, or stop what they are doing when you call their name?)", insight: "Not responding to their name can be worrying, but it is highly treatable. Aminy offers step-by-step 'Name Game' routines that use positive reinforcement to build this critical habit in just days." },
    { id: 11, text: "When you smile at your child, does your child smile back at you?", isReverseScored: false },
    { id: 12, text: "Does your child get upset by everyday noises?", isReverseScored: true, example: "(FOR EXAMPLE, does your child scream or cry to noise such as a vacuum cleaner or loud music?)", insight: "Sensory overwhelm is tough on the whole family. Aminy includes tailored 'Desensitization' routines and a digital 'Calm Corner' to help your child process sensory input peacefully." },
    { id: 13, text: "Does your child walk?", isReverseScored: false },
    { id: 14, text: "Does your child look you in the eye when you are talking to them, playing with them, or dressing them?", isReverseScored: false },
    { id: 15, text: "Does your child try to copy what you do?", isReverseScored: false, example: "(FOR EXAMPLE, wave bye-bye, clap, or make a funny noise when you do?)" },
    { id: 16, text: "If you turn your head to look at something, does your child look around to see what you are looking at?", isReverseScored: false },
    { id: 17, text: "Does your child try to get you to watch them?", isReverseScored: false, example: "(FOR EXAMPLE, does your child look at you for praise, or say 'look' or 'watch me'?)" },
    { id: 18, text: "Does your child understand when you tell them to do something?", isReverseScored: false, example: "(FOR EXAMPLE, if you don't point, can your child understand 'put the book on the chair' or 'bring me the blanket'?)" },
    { id: 19, text: "If something new happens, does your child look at your face to see how you feel about it?", isReverseScored: false, example: "(FOR EXAMPLE, if they hear a strange or funny noise, or see a new toy, will they look at your face?)" },
    { id: 20, text: "Does your child like movement activities?", isReverseScored: false, example: "(FOR EXAMPLE, being swung or bounced on your knee?)" }
];

interface MCHATScreeningProps {
    onComplete: (score: number, riskLevel: 'low' | 'medium' | 'high') => void;
    onBack: () => void;
    childName?: string;
}

export function MCHATScreening({ onComplete, onBack, childName = "your child" }: MCHATScreeningProps) {
    const [currentStep, setCurrentStep] = useState(-1); // -1 is the intro screen
    const [answers, setAnswers] = useState<Record<number, boolean>>({});
    const [showInsight, setShowInsight] = useState(false);

    const handleAnswer = (value: boolean) => {
        const question = MCH_QUESTIONS[currentStep];
        setAnswers(prev => ({ ...prev, [question.id]: value }));

        // Check if this is an "at-risk" answer
        const isAtRisk = question.isReverseScored ? value === true : value === false;

        // If at-risk and we have a sales insight, show it before advancing
        if (isAtRisk && question.insight) {
            setShowInsight(true);
            return;
        }

        advanceStep();
    };

    const advanceStep = () => {
        setShowInsight(false);
        if (currentStep < MCH_QUESTIONS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            // Need the final answer from state, which is already saved since handleAnswer calls setAnswers
            finishScreening();
        }
    };

    const finishScreening = () => {
        // Scoring is derived in getScoreInfo() for the end screen; just advance.
        setCurrentStep(MCH_QUESTIONS.length); // End screen
    };

    // Compute immediate current score dynamically (for end screen)
    const getScoreInfo = () => {
        let score = 0;
        MCH_QUESTIONS.forEach(q => {
            const answer = answers[q.id];
            if (answer !== undefined) {
                if (q.isReverseScored && answer === true) score++;
                else if (!q.isReverseScored && answer === false) score++;
            }
        });

        let riskLevel = 'Low';
        let riskColor = 'text-green-600';
        let riskBg = 'bg-green-100';
        let recommendation = '';

        if (score >= 8) {
            riskLevel = 'High';
            riskColor = 'text-red-600';
            riskBg = 'bg-red-100';
            recommendation = 'It is highly recommended that you schedule a diagnostic evaluation with a developmental pediatrician or psychologist.';
        } else if (score >= 3) {
            riskLevel = 'Medium';
            riskColor = 'text-amber-600';
            riskBg = 'bg-amber-100';
            recommendation = 'We recommend setting up a follow-up interview or initial consultation with a specialist.';
        } else {
            recommendation = 'Your child is currently showing a low risk for developmental concerns based on this screener. Routine checkups are recommended.';
        }

        return { score, riskLevel, riskColor, riskBg, recommendation };
    };

    if (currentStep === -1) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
                    <div className="max-w-2xl mx-auto px-4 py-4">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={onBack}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <h1 className="text-lg font-semibold text-gray-900">M-CHAT-R™ Screening</h1>
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto px-4 py-8">
                    <div className="mb-6 flex justify-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <Activity className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">
                        Check {childName}'s Development
                    </h2>

                    <p className="text-gray-600 text-center mb-8 max-w-lg mx-auto">
                        The Modified Checklist for Autism in Toddlers (M-CHAT-R) is a scientifically validated tool used to assess risk for Autism Spectrum Disorder (ASD).
                        It takes just 2 minutes to complete.
                    </p>

                    <Card className="p-5 bg-gray-50 border border-gray-100 mb-8">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                            <Info className="w-4 h-4 text-blue-500 mr-2" />
                            Before you begin
                        </h3>
                        <ul className="text-sm text-gray-600 space-y-2">
                            <li>• Answer based on how {childName} <strong>usually</strong> behaves.</li>
                            <li>• Try every question. If the behavior is rare, answer "No".</li>
                            <li>• This is a screener, not a diagnostic tool. Your results will help guide our next steps together.</li>
                        </ul>
                    </Card>

                    <Button
                        className="w-full bg-accent hover:bg-accent/90 text-lg py-6"
                        onClick={() => setCurrentStep(0)}
                    >
                        Start Screening
                    </Button>
                </div>
            </div>
        );
    }

    if (currentStep === MCH_QUESTIONS.length) {
        const { score, riskLevel, riskColor, riskBg, recommendation } = getScoreInfo();
        return (
            <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
                    <div className="max-w-2xl mx-auto px-4 py-4">
                        <h1 className="text-lg font-semibold text-gray-900">Screening Complete</h1>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto px-4 py-8">
                    <div className={`p-6 rounded-2xl ${riskBg} border border-opacity-50 mb-8 flex flex-col items-center text-center`}>
                        {riskLevel === 'Low' ? (
                            <CheckCircle className={`w-12 h-12 ${riskColor} mb-4`} />
                        ) : (
                            <AlertCircle className={`w-12 h-12 ${riskColor} mb-4`} />
                        )}
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {riskLevel} Risk Profile
                        </h2>
                        <p className="text-gray-700 text-lg">
                            Score: {score} out of 20
                        </p>
                    </div>

                    <Card className="p-6 mb-8 border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3 text-lg">What does this mean?</h3>
                        <p className="text-gray-600 mb-4 whitespace-pre-line leading-relaxed">
                            {recommendation}
                        </p>
                        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100 mt-4">
                            <strong>Note:</strong> Aminy will safely store this screening result. This can be directly forwarded to a clinician or provider to save time during your initial intake.
                        </div>
                    </Card>

                    <Button
                        className="w-full bg-accent hover:bg-accent/90 text-lg py-6"
                        onClick={() => {
                            onComplete(score, riskLevel.toLowerCase() as 'low' | 'medium' | 'high');
                        }}
                    >
                        Review Next Care Steps
                    </Button>
                </div>
            </div>
        );
    }

    const question = MCH_QUESTIONS[currentStep];
    const progress = ((currentStep + 1) / MCH_QUESTIONS.length) * 100;

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
            {/* Header with Progress */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3 mb-4">
                        <Button variant="ghost" size="sm" onClick={() => currentStep === 0 ? setCurrentStep(-1) : setCurrentStep(prev => prev - 1)}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <h1 className="text-lg font-semibold text-gray-900 text-center flex-1">
                            Question {currentStep + 1} of {MCH_QUESTIONS.length}
                        </h1>
                        <div className="w-8" /> {/* Spacer */}
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 py-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 leading-tight">
                    {question.text}
                </h2>

                {question.example && (
                    <p className="text-gray-600 text-lg mb-8 italic">
                        {question.example}
                    </p>
                )}

                {!showInsight ? (
                    <div className="flex flex-col gap-4 mt-8">
                        <Button
                            variant="outline"
                            className="py-8 text-xl font-semibold border-2 hover:bg-accent/5 hover:border-accent transition-all justify-start px-6"
                            onClick={() => handleAnswer(true)}
                        >
                            Yes
                        </Button>
                        <Button
                            variant="outline"
                            className="py-8 text-xl font-semibold border-2 hover:bg-accent/5 hover:border-accent transition-all justify-start px-6"
                            onClick={() => handleAnswer(false)}
                        >
                            No
                        </Button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8"
                    >
                        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 p-6 rounded-2xl shadow-sm mb-6">
                            <div className="flex gap-3">
                                <Activity className="w-6 h-6 text-teal-600 shrink-0 mt-1" />
                                <div>
                                    <h3 className="text-teal-900 font-semibold text-lg mb-2">How Aminy Can Help</h3>
                                    <p className="text-teal-800 leading-relaxed text-[15px]">
                                        {question.insight}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Button
                            className="w-full bg-accent hover:bg-accent/90 text-lg py-6 shadow-md"
                            onClick={advanceStep}
                        >
                            Continue Screening
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
