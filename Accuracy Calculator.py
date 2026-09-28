import easygui as eg

# XAcc = (perfect + (lPerfect + ePerfect) * 0.75 + (earlySingle + lateSingle) * 0.4 + earlyDouble * 0.2) / sum(judgements)
judgements = eg.multenterbox(
    "请输入详细结果",
    "Accuracy Calculator",
    ("earlyDouble", "earlySingle", "ePerfect", "perfect", "lPerfect", "lateSingle"),
)
for i in range(len(judgements)):
    if judgements[i] == "":
        judgements[i] = 0
    judgements[i] = int(judgements[i])
print(judgements)
earlyDouble, earlySingle, ePerfect, perfect, lPerfect, lateSingle = judgements
XAcc = (
    perfect
    + (lPerfect + ePerfect) * 0.75
    + (earlySingle + lateSingle) * 0.4
    + earlyDouble * 0.2
) / sum(judgements)
eg.msgbox(
    "XAcc:{}/100.0%".format(str(XAcc * 100) + "%"),
    "Accuracy Calculator",
    "Finish",
)
