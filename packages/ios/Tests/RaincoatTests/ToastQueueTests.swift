import Testing

@testable import Raincoat

// The order of the toasts and the timer of the one on the screen, with a clock of the tests' own:
// every call says what time it is. This file uses no SwiftUI and runs on Linux.

private typealias Queue = ToastQueue<String>

/// A queue with one toast on the screen, shown at time 0.
private func showing(_ message: String = "Message archived", staysUntilClosed: Bool = false) -> Queue {
    var queue = Queue(duration: toastDuration)
    queue.add(message, message: message, staysUntilClosed: staysUntilClosed, now: 0)
    return queue
}

@Test func aToastWithoutAnActionStaysSixSeconds() {
    #expect(toastDuration == 6)
    var queue = showing()
    #expect(queue.deadline == 6)
    #expect(!queue.expire(now: 5.999))
    #expect(queue.shown != nil)
    #expect(queue.expire(now: 6))
    #expect(queue.shown == nil)
}

@Test func aToastWithAnActionStaysUntilItIsClosed() {
    var queue = showing(staysUntilClosed: true)
    #expect(queue.deadline == nil)
    #expect(!queue.expire(now: 3600))
    let id = queue.shown?.id ?? -1
    #expect(queue.close(id))
    #expect(queue.shown == nil)
}

@Test(arguments: ToastPause.allCases)
func eachPauseStopsTheTimerAndItGoesOnFromWhereItStopped(pause: ToastPause) {
    var queue = showing()
    queue.setPaused(pause, true, now: 4)
    #expect(queue.deadline == nil)
    #expect(!queue.expire(now: 600))
    queue.setPaused(pause, false, now: 600)
    // Two seconds were left when it stopped.
    #expect(queue.deadline == 602)
    #expect(!queue.expire(now: 601.999))
    #expect(queue.expire(now: 602))
}

@Test func theTimerRunsOnlyOnceEveryPauseIsOver() {
    var queue = showing()
    queue.setPaused(.hover, true, now: 1)
    queue.setPaused(.background, true, now: 2)
    queue.setPaused(.hover, false, now: 3)
    #expect(queue.deadline == nil)
    queue.setPaused(.background, false, now: 10)
    #expect(queue.deadline == 15)
    // Saying the same thing twice changes nothing.
    queue.setPaused(.background, false, now: 11)
    #expect(queue.deadline == 15)
}

@Test func toastsAreShownOneAtATimeInOrder() {
    var queue = Queue(duration: toastDuration)
    let first = queue.add("First", message: "First", staysUntilClosed: true, now: 0)
    let second = queue.add("Second", message: "Second", staysUntilClosed: false, now: 1)
    #expect(first?.item == "First")
    // The second waits.
    #expect(second == nil)
    #expect(queue.shown?.item == "First")
    #expect(queue.waiting.map(\.item) == ["Second"])

    #expect(queue.close(queue.shown?.id ?? -1))
    // It waits on while the first leaves the screen.
    #expect(queue.shown == nil)
    #expect(queue.isLeaving)
    let next = queue.finishLeaving(now: 20)
    #expect(next?.item == "Second")
    #expect(queue.shown?.item == "Second")
    // Its timer starts when it is shown, with the whole time.
    #expect(queue.deadline == 26)
    #expect(queue.finishLeaving(now: 21) == nil)
}

@Test func aToastAddedWhileAnotherLeavesWaitsForIt() {
    var queue = showing()
    #expect(queue.expire(now: 6))
    #expect(queue.add("Second", message: "Second", staysUntilClosed: false, now: 6.05) == nil)
    #expect(queue.finishLeaving(now: 6.1)?.item == "Second")
}

@Test func closingAToastThatIsNotShownDoesNothing() {
    var queue = showing()
    let id = queue.shown?.id ?? -1
    #expect(!queue.close(id + 1))
    #expect(queue.close(id))
    #expect(!queue.close(id))
}

@Test func aPointerOrFocusOnALeavingToastDoesNotPauseTheNextButTheBackgroundDoes() {
    var queue = showing()
    queue.add("Second", message: "Second", staysUntilClosed: false, now: 0)
    queue.add("Third", message: "Third", staysUntilClosed: false, now: 0)
    queue.setPaused(.hover, true, now: 1)
    queue.setPaused(.focus, true, now: 1)
    queue.close(queue.shown?.id ?? -1)
    queue.finishLeaving(now: 2)
    #expect(queue.pauses.isEmpty)
    #expect(queue.deadline == 8)

    queue.setPaused(.background, true, now: 3)
    queue.close(queue.shown?.id ?? -1)
    queue.finishLeaving(now: 4)
    #expect(queue.shown?.item == "Third")
    #expect(queue.pauses == [.background])
    #expect(queue.deadline == nil)
    queue.setPaused(.background, false, now: 100)
    #expect(queue.deadline == 106)
}

@Test func theMessageIsKeptForTheAnnouncement() {
    var queue = Queue(duration: toastDuration)
    let shown = queue.add("toast", message: "Link copied", staysUntilClosed: false, now: 0)
    #expect(shown?.message == "Link copied")
}
