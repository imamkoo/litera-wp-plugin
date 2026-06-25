import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Progress } from "@heroui/react";
import { CheckCircle2Icon, XCircleIcon, BookOpenIcon, AlertCircleIcon, Loader2Icon } from 'lucide-react';

export interface Option {
  id: number;
  text: string;
}

export interface Question {
  id: number;
  text: string;
  options: Option[];
}

export interface QuizResult {
  success: boolean;
  score: number;
  status: string;
  passingScore: number;
  correctAnswers: number;
  totalQuestions: number;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  questions: Question[];
  passingScore?: number; // percentage, from backend API
  onSubmitAnswers: (answers: { questionId: number, optionId: number }[]) => Promise<QuizResult | null>;
}

export const QuizModal: React.FC<QuizModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  questions,
  passingScore = 60,
  onSubmitAnswers
}) => {
  const [step, setStep] = useState<'intro' | 'quiz' | 'submitting' | 'result' | 'error'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const resetQuiz = () => {
    setStep('intro');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setQuizResult(null);
  };

  const handleStart = () => {
    setStep('quiz');
  };

  const handleSelectOption = (optionId: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));
    }
  };

  const selectedOptionId = questions[currentQuestionIndex] ? (answers[questions[currentQuestionIndex].id] ?? null) : null;

  const handleNext = async () => {
    if (selectedOptionId === null) return;
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Last question, submit
      setStep('submitting');
      try {
        const answersArray = Object.entries(answers).map(([qId, oId]) => ({
          questionId: Number(qId),
          optionId: oId
        }));
        const result = await onSubmitAnswers(answersArray);
        if (result) {
          setQuizResult(result);
          setStep('result');
        } else {
          // Backend failed or returned error
          setStep('error');
        }
      } catch (err) {
        console.error("Failed to submit quiz", err);
        setStep('error');
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleRetrySubmit = async () => {
    setStep('submitting');
    try {
      const answersArray = Object.entries(answers).map(([qId, oId]) => ({
        questionId: Number(qId),
        optionId: oId
      }));
      const result = await onSubmitAnswers(answersArray);
      if (result) {
        setQuizResult(result);
        setStep('result');
      } else {
        setStep('error');
      }
    } catch (err) {
      console.error("Failed to submit quiz", err);
      setStep('error');
    }
  };

  const isPassed = quizResult?.status === 'PASS';

  const handleContinue = () => {
    onSuccess();
    onClose();
    setTimeout(resetQuiz, 500); 
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={(open) => {
        if (!open && step !== 'submitting') {
          onClose();
          setTimeout(resetQuiz, 500);
        }
      }}
      size="md"
      backdrop="blur"
      scrollBehavior="inside"
      isDismissable={step !== 'submitting'}
      hideCloseButton={step === 'submitting'}
      classNames={{
        base: "bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl",
        header: "border-b border-slate-100 dark:border-slate-800",
        footer: "border-t border-slate-100 dark:border-slate-800"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            {step === 'intro' && (
              <>
                <ModalHeader className="flex flex-col gap-1 items-center pt-8">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <BookOpenIcon size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">Knowledge Check Required</h2>
                </ModalHeader>
                <ModalBody className="py-6 text-center">
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                    Untuk membuka NFT ini, Anda perlu menyelesaikan Knowledge Check guna memastikan pemahaman tentang isi artikel.
                  </p>
                  <div className="flex justify-center text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl text-blue-600">{questions.length}</span>
                      <span>Total Questions</span>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter className="pb-8 justify-center">
                  <Button 
                    className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-[0_4px_0_0_#334155] active:shadow-[0_0px_0_0_#334155] active:translate-y-1 transition-all"
                    onPress={handleStart}
                  >
                    Start Quiz
                  </Button>
                </ModalFooter>
              </>
            )}

            {step === 'quiz' && questions.length > 0 && (
              <>
                <ModalHeader className="flex flex-col gap-2 pt-6">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <span className="text-sm font-bold text-blue-600">{Math.round((currentQuestionIndex / questions.length) * 100)}%</span>
                  </div>
                  <Progress value={(currentQuestionIndex / questions.length) * 100} className="h-2" color="primary" />
                </ModalHeader>
                <ModalBody className="py-6">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-snug mb-6">
                    {questions[currentQuestionIndex].text}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {questions[currentQuestionIndex].options.map((option) => {
                      const isSelected = selectedOptionId === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleSelectOption(option.id)}
                          className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' 
                              : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-blue-600' : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {isSelected && <div className="w-3 h-3 rounded-full bg-blue-600" />}
                            </div>
                            <span className="leading-snug">{option.text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ModalBody>
                <ModalFooter className="pb-6 flex gap-3">
                  {currentQuestionIndex > 0 && (
                    <Button 
                      className="w-full h-14 rounded-2xl font-black text-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-[0_4px_0_0_#cbd5e1] dark:shadow-[0_4px_0_0_#334155] active:shadow-none active:translate-y-1 transition-all border border-slate-200 dark:border-slate-700"
                      onPress={handlePrevious}
                    >
                      Previous
                    </Button>
                  )}
                  <Button 
                    className="w-full h-14 rounded-2xl font-black text-lg shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-1 transition-all disabled:shadow-none disabled:translate-y-0"
                    color="primary"
                    isDisabled={selectedOptionId === null}
                    onPress={handleNext}
                  >
                    {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next'}
                  </Button>
                </ModalFooter>
              </>
            )}

            {step === 'submitting' && (
              <ModalBody className="py-16 text-center flex flex-col items-center justify-center">
                <Loader2Icon size={48} className="text-blue-600 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Menilai Jawaban Anda...</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Harap tunggu sebentar, kami sedang memverifikasi hasil kuis.</p>
              </ModalBody>
            )}

            {step === 'result' && quizResult && (
              <>
                <ModalHeader className="flex flex-col gap-1 items-center pt-8">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                    isPassed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'
                  }`}>
                    {isPassed ? <CheckCircle2Icon size={40} /> : <AlertCircleIcon size={40} />}
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                    {isPassed ? 'Knowledge Check Passed!' : 'Knowledge Check Failed'}
                  </h2>
                </ModalHeader>
                <ModalBody className="py-6 text-center">
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Your Score</p>
                  <div className={`text-6xl font-black mb-4 ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {quizResult.score}%
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {isPassed 
                      ? "Excellent! You have demonstrated a solid understanding of the material." 
                      : `You need at least ${quizResult.passingScore}% to pass. Please review the material and try again.`}
                  </p>
                </ModalBody>
                <ModalFooter className="pb-8 justify-center">
                  {isPassed ? (
                    <Button 
                      className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-black text-lg shadow-xl shadow-emerald-600/30"
                      onPress={handleContinue}
                    >
                      Continue to NFT Mint
                    </Button>
                  ) : (
                    <Button 
                      className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-xl"
                      onPress={() => {
                        resetQuiz();
                        setStep('quiz');
                      }}
                    >
                      Try Again
                    </Button>
                  )}
                </ModalFooter>
              </>
            )}

            {step === 'error' && (
              <>
                <ModalHeader className="flex flex-col gap-1 items-center pt-8">
                  <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mb-4">
                    <AlertCircleIcon size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">Submission Failed</h2>
                </ModalHeader>
                <ModalBody className="py-6 text-center">
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Your answers could not be saved.<br/>Please try again.
                  </p>
                </ModalBody>
                <ModalFooter className="pb-8 justify-center">
                  <Button 
                    className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-[0_4px_0_0_#334155] active:shadow-none active:translate-y-1 transition-all"
                    onPress={handleRetrySubmit}
                  >
                    Retry Submission
                  </Button>
                </ModalFooter>
              </>
            )}
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default QuizModal;
